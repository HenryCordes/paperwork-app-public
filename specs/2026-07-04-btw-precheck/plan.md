# BTW Pre-Check Mobile Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the BTW pre-check backend contract (already live on `main` of the `paperwork` repo) into the mobile app's existing Taxes page: a report view, a run-now button, check-type/notification toggles, and a notification deep-link — per `specs/2026-07-04-btw-precheck/design.md`.

**Architecture:** Two new self-contained components (`BtwPrecheckReportCard`, `BtwPrecheckSettingsCard`), each with its own data hooks, dropped into the existing `Taxes` page next to the existing cards — mirroring how `VatReturnDeadlineCard` already works there. A new `btwPrecheckService`/`useBtwPrecheck` hook layer follows the exact conventions of the sibling `taxesService`/`useTaxes` and `vatNotificationPreferencesService`/`useVatNotificationPreferences` pairs already in the codebase.

**Tech Stack:** Ionic React 8, TypeScript strict, TanStack Query 5 + axios, React Router 5 (`useHistory`), Vitest + Testing Library, `ionicons`.

## Global Constraints

- Package manager is **npm**. Run `npm run test.unit` before every commit; run `npm run typecheck` and `npm run lint` before the final commit of each task.
- Branch: work happens on `feat/btw-precheck` (already created; the design spec commit `04b5014` is its first commit).
- Conventional Commits, imperative subject, no Co-Authored-By trailer, no "Generated with" line.
- TypeScript strict; `any` is forbidden — use `unknown` + narrowing. One export per file. JSDoc on public functions.
- Dutch-only UI copy — no `messageEn` rendering, no language-switch UI (per the design's confirmed current-scope limit).
- Money/date formatting: none needed in this feature (findings are pre-formatted Dutch strings from the backend; no raw amounts are rendered client-side).
- Tests live under `src/__tests__/`, mirroring the source path (e.g. `src/hooks/useBtwPrecheck.ts` → `src/__tests__/hooks/useBtwPrecheck.test.tsx`). Run a single file with `npx vitest run <path>`.
- Follow existing patterns exactly: services never wrap `AxiosError` in a generic `Error` except where this plan explicitly says to (typed errors for `runPrecheck`); `getLatestReport`'s 404-to-`null` mapping is the only other special case.

---

### Task 1: Client-side "quarter under review" helper

**Files:**
- Create: `src/utils/btwPeriodUtils.ts`
- Test: `src/__tests__/utils/btwPeriodUtils.test.ts`

**Interfaces:**
- Produces: `export interface ReviewPeriod { period: "Q1" | "Q2" | "Q3" | "Q4"; year: number }` and `export function getCurrentReviewPeriod(now?: Date): ReviewPeriod` — used by Task 7 (Taxes page) to compute which period to query.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { getCurrentReviewPeriod } from "../../utils/btwPeriodUtils";

describe("getCurrentReviewPeriod", () => {
  it("in July reviews Q2 of the same year", () => {
    expect(getCurrentReviewPeriod(new Date(2026, 6, 10))).toEqual({
      period: "Q2",
      year: 2026,
    });
  });

  it("in January reviews Q4 of the previous year", () => {
    expect(getCurrentReviewPeriod(new Date(2026, 0, 15))).toEqual({
      period: "Q4",
      year: 2025,
    });
  });

  it("in May reviews Q1 of the same year", () => {
    expect(getCurrentReviewPeriod(new Date(2026, 4, 5))).toEqual({
      period: "Q1",
      year: 2026,
    });
  });

  it("in October reviews Q3 of the same year", () => {
    expect(getCurrentReviewPeriod(new Date(2026, 9, 1))).toEqual({
      period: "Q3",
      year: 2026,
    });
  });

  it("defaults to the current date when no argument is given", () => {
    const result = getCurrentReviewPeriod();
    expect(["Q1", "Q2", "Q3", "Q4"]).toContain(result.period);
    expect(typeof result.year).toBe("number");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/utils/btwPeriodUtils.test.ts`
Expected: FAIL — cannot find module `../../utils/btwPeriodUtils`.

- [ ] **Step 3: Write the implementation**

```ts
export interface ReviewPeriod {
  period: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

/**
 * The quarter whose BTW filing is due next: the most recently ended
 * quarter. Mirrors the backend's getQuarterUnderReview so the mobile app
 * asks for the same period the backend's scheduled report was created for.
 */
export function getCurrentReviewPeriod(now: Date = new Date()): ReviewPeriod {
  const quarterIndex = Math.floor(now.getMonth() / 3); // 0..3, current quarter
  if (quarterIndex === 0) {
    return { period: "Q4", year: now.getFullYear() - 1 };
  }
  return { period: QUARTERS[quarterIndex - 1], year: now.getFullYear() };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/utils/btwPeriodUtils.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
npm run typecheck
git add src/utils/btwPeriodUtils.ts src/__tests__/utils/btwPeriodUtils.test.ts
git commit -m "feat(btw-precheck): add client-side quarter-under-review helper"
```

---

### Task 2: API types and service (with typed run errors)

**Files:**
- Create: `src/api/types/btwPrecheck.ts`
- Create: `src/api/services/btwPrecheckService.ts`
- Test: `src/__tests__/api/services/btwPrecheckService.test.ts`

**Interfaces:**
- Produces: all types below, plus `BtwPrecheckAlreadyRunningError`, `BtwPrecheckDailyCapReachedError` (both `extends Error`), and the default-exported `btwPrecheckService` singleton with methods `getLatestReport(period, year)`, `getReport(id)`, `runPrecheck(data)`, `getPreferences()`, `updatePreferences(data)`. Used by Task 3 (hooks).

- [ ] **Step 1: Write the types**

`src/api/types/btwPrecheck.ts`:

```ts
export type FindingCode =
  | "MISSING_DOCUMENT"
  | "VAT_ARITHMETIC_MISMATCH"
  | "VAT_RATE_UNUSUAL"
  | "DUPLICATE_SUSPECTED"
  | "HISTORY_ANOMALY"
  | "NO_ACTIVITY";

export interface Finding {
  code: FindingCode;
  severity: "warning" | "info";
  messageNl: string;
  messageEn: string;
  entityType: "expense" | "invoice" | "period";
  entityId: string | null;
  meta: Record<string, unknown>;
}

export interface BtwPrecheckReport {
  _id: string;
  tenantId: string;
  periodType: "quarterly";
  period: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
  status: "running" | "completed" | "failed";
  trigger: "scheduled" | "manual";
  findings: Finding[];
  meta: {
    model?: string | null;
    tokensUsed?: { input: number; output: number } | null;
    toolCalls?: number | null;
    latencyMs?: number | null;
    anomalyStatus:
      | "pending"
      | "completed"
      | "failed"
      | "skipped_insufficient_history"
      | "disabled";
  };
  createdAt: string;
  updatedAt: string;
}

export interface BtwPrecheckReportResponse {
  success: boolean;
  data: BtwPrecheckReport;
}

export interface RunBtwPrecheckRequest {
  period: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
}

export interface RunBtwPrecheckResponse {
  success: boolean;
  data: { reportId: string; status: "running" };
}

export interface BtwPrecheckPreferences {
  _id: string;
  userId: string;
  tenantId: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  pushNotifications: boolean;
  preferredLanguage: "nl" | "en";
  createdAt: string;
  updatedAt: string;
}

export interface BtwPrecheckPreferencesResponse {
  success: boolean;
  data: BtwPrecheckPreferences;
}

export interface BtwPrecheckPreferencesUpdateRequest {
  emailNotifications?: boolean;
  inAppNotifications?: boolean;
  pushNotifications?: boolean;
}
```

- [ ] **Step 2: Write the failing test**

`src/__tests__/api/services/btwPrecheckService.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../api/axiosInstance", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

import axiosInstance from "../../../api/axiosInstance";
import btwPrecheckService, {
  BtwPrecheckAlreadyRunningError,
  BtwPrecheckDailyCapReachedError,
} from "../../../api/services/btwPrecheckService";
import type {
  BtwPrecheckReportResponse,
  RunBtwPrecheckResponse,
  BtwPrecheckPreferencesResponse,
} from "../../../api/types/btwPrecheck";

const mockedGet = vi.mocked(axiosInstance.get);
const mockedPost = vi.mocked(axiosInstance.post);
const mockedPut = vi.mocked(axiosInstance.put);

const makeReportResponse = (
  overrides: Partial<BtwPrecheckReportResponse["data"]> = {}
): BtwPrecheckReportResponse => ({
  success: true,
  data: {
    _id: "report-1",
    tenantId: "tenant-1",
    periodType: "quarterly",
    period: "Q2",
    year: 2026,
    status: "completed",
    trigger: "manual",
    findings: [],
    meta: { anomalyStatus: "completed" },
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  },
});

describe("btwPrecheckService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLatestReport", () => {
    it("fetches the latest report with period/year query params", async () => {
      const response = makeReportResponse();
      mockedGet.mockResolvedValue({ data: response });

      const result = await btwPrecheckService.getLatestReport("Q2", 2026);

      expect(result).toEqual(response);
      expect(mockedGet).toHaveBeenCalledWith("/btw-precheck/latest", {
        params: { period: "Q2", year: 2026 },
      });
    });

    it("returns null when no report exists yet (404)", async () => {
      mockedGet.mockRejectedValue({ response: { status: 404 } });

      const result = await btwPrecheckService.getLatestReport("Q2", 2026);

      expect(result).toBeNull();
    });

    it("rethrows any other error", async () => {
      mockedGet.mockRejectedValue({ response: { status: 503 } });

      await expect(
        btwPrecheckService.getLatestReport("Q2", 2026)
      ).rejects.toMatchObject({ response: { status: 503 } });
    });
  });

  describe("getReport", () => {
    it("fetches a report by id", async () => {
      const response = makeReportResponse();
      mockedGet.mockResolvedValue({ data: response });

      const result = await btwPrecheckService.getReport("report-1");

      expect(result).toEqual(response);
      expect(mockedGet).toHaveBeenCalledWith("/btw-precheck/report-1");
    });
  });

  describe("runPrecheck", () => {
    it("posts the period/year and returns the reportId", async () => {
      const response: RunBtwPrecheckResponse = {
        success: true,
        data: { reportId: "report-2", status: "running" },
      };
      mockedPost.mockResolvedValue({ data: response });

      const result = await btwPrecheckService.runPrecheck({
        period: "Q2",
        year: 2026,
      });

      expect(result).toEqual(response);
      expect(mockedPost).toHaveBeenCalledWith("/btw-precheck/run", {
        period: "Q2",
        year: 2026,
      });
    });

    it("throws BtwPrecheckAlreadyRunningError on 409", async () => {
      mockedPost.mockRejectedValue({ response: { status: 409 } });

      await expect(
        btwPrecheckService.runPrecheck({ period: "Q2", year: 2026 })
      ).rejects.toThrow(BtwPrecheckAlreadyRunningError);
    });

    it("throws BtwPrecheckDailyCapReachedError on 429", async () => {
      mockedPost.mockRejectedValue({ response: { status: 429 } });

      await expect(
        btwPrecheckService.runPrecheck({ period: "Q2", year: 2026 })
      ).rejects.toThrow(BtwPrecheckDailyCapReachedError);
    });

    it("rethrows any other error unchanged", async () => {
      mockedPost.mockRejectedValue({ response: { status: 503 } });

      await expect(
        btwPrecheckService.runPrecheck({ period: "Q2", year: 2026 })
      ).rejects.toMatchObject({ response: { status: 503 } });
    });
  });

  describe("preferences", () => {
    it("gets preferences", async () => {
      const response: BtwPrecheckPreferencesResponse = {
        success: true,
        data: {
          _id: "pref-1",
          userId: "user-1",
          tenantId: "tenant-1",
          emailNotifications: true,
          inAppNotifications: true,
          pushNotifications: false,
          preferredLanguage: "nl",
          createdAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      };
      mockedGet.mockResolvedValue({ data: response });

      const result = await btwPrecheckService.getPreferences();

      expect(result).toEqual(response);
      expect(mockedGet).toHaveBeenCalledWith("/btw-precheck/preferences");
    });

    it("updates preferences", async () => {
      const response: BtwPrecheckPreferencesResponse = {
        success: true,
        data: {
          _id: "pref-1",
          userId: "user-1",
          tenantId: "tenant-1",
          emailNotifications: false,
          inAppNotifications: true,
          pushNotifications: true,
          preferredLanguage: "nl",
          createdAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      };
      mockedPut.mockResolvedValue({ data: response });

      const result = await btwPrecheckService.updatePreferences({
        emailNotifications: false,
        pushNotifications: true,
      });

      expect(result).toEqual(response);
      expect(mockedPut).toHaveBeenCalledWith("/btw-precheck/preferences", {
        emailNotifications: false,
        pushNotifications: true,
      });
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/__tests__/api/services/btwPrecheckService.test.ts`
Expected: FAIL — cannot find module `../../../api/services/btwPrecheckService`.

- [ ] **Step 4: Write the service implementation**

`src/api/services/btwPrecheckService.ts`:

```ts
import { AxiosError } from "axios";

import axiosInstance from "../axiosInstance";
import { ApiError } from "../types";
import {
  BtwPrecheckPreferencesResponse,
  BtwPrecheckPreferencesUpdateRequest,
  BtwPrecheckReportResponse,
  RunBtwPrecheckRequest,
  RunBtwPrecheckResponse,
} from "../types/btwPrecheck";

export class BtwPrecheckAlreadyRunningError extends Error {
  constructor() {
    super("A pre-check is already running for this period");
    this.name = "BtwPrecheckAlreadyRunningError";
  }
}

export class BtwPrecheckDailyCapReachedError extends Error {
  constructor() {
    super("Daily manual pre-check limit reached");
    this.name = "BtwPrecheckDailyCapReachedError";
  }
}

class BtwPrecheckService {
  async getLatestReport(
    period: string,
    year: number
  ): Promise<BtwPrecheckReportResponse | null> {
    try {
      const response = await axiosInstance.get<BtwPrecheckReportResponse>(
        "/btw-precheck/latest",
        { params: { period, year } }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getReport(id: string): Promise<BtwPrecheckReportResponse> {
    const response = await axiosInstance.get<BtwPrecheckReportResponse>(
      `/btw-precheck/${id}`
    );
    return response.data;
  }

  async runPrecheck(
    data: RunBtwPrecheckRequest
  ): Promise<RunBtwPrecheckResponse> {
    try {
      const response = await axiosInstance.post<RunBtwPrecheckResponse>(
        "/btw-precheck/run",
        data
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.status === 409) {
        throw new BtwPrecheckAlreadyRunningError();
      }
      if (axiosError.response?.status === 429) {
        throw new BtwPrecheckDailyCapReachedError();
      }
      throw error;
    }
  }

  async getPreferences(): Promise<BtwPrecheckPreferencesResponse> {
    const response = await axiosInstance.get<BtwPrecheckPreferencesResponse>(
      "/btw-precheck/preferences"
    );
    return response.data;
  }

  async updatePreferences(
    data: BtwPrecheckPreferencesUpdateRequest
  ): Promise<BtwPrecheckPreferencesResponse> {
    const response = await axiosInstance.put<BtwPrecheckPreferencesResponse>(
      "/btw-precheck/preferences",
      data
    );
    return response.data;
  }
}

export default new BtwPrecheckService();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/api/services/btwPrecheckService.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
npm run typecheck
git add src/api/types/btwPrecheck.ts src/api/services/btwPrecheckService.ts src/__tests__/api/services/btwPrecheckService.test.ts
git commit -m "feat(btw-precheck): add API types and service with typed run errors"
```

---

### Task 3: Query keys and TanStack Query hooks

**Files:**
- Modify: `src/api/queryKeys.ts` (add a `btwPrecheck` namespace after the existing `taxes` namespace)
- Create: `src/hooks/useBtwPrecheck.ts`
- Test: `src/__tests__/hooks/useBtwPrecheck.test.tsx`

**Interfaces:**
- Consumes: `btwPrecheckService` and all types from Task 2.
- Produces: `QueryKeys.btwPrecheck.{base,latest,preferences}`; `getBtwPrecheckRefetchInterval(query)`; hooks `useBtwPrecheckLatestReport(period, year)`, `useRunBtwPrecheck()`, `useBtwPrecheckPreferences()`, `useUpdateBtwPrecheckPreferences()`. Used by Task 4 and Task 5 (components).

- [ ] **Step 1: Add the query keys**

In `src/api/queryKeys.ts`, add after the `taxes` block (before the closing `};` of `QueryKeys`):

```ts
  // BTW pre-check related keys
  btwPrecheck: {
    base: ["btwPrecheck"] as const,
    latest: (period: string, year: number) =>
      [...QueryKeys.btwPrecheck.base, "latest", period, year] as const,
    preferences: () =>
      [...QueryKeys.btwPrecheck.base, "preferences"] as const,
  },
```

- [ ] **Step 2: Write the failing test**

`src/__tests__/hooks/useBtwPrecheck.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient, makeTestQueryClient } from "../test-utils";
import {
  useBtwPrecheckLatestReport,
  useRunBtwPrecheck,
  useBtwPrecheckPreferences,
  useUpdateBtwPrecheckPreferences,
  getBtwPrecheckRefetchInterval,
} from "../../hooks/useBtwPrecheck";
import btwPrecheckService, {
  BtwPrecheckAlreadyRunningError,
} from "../../api/services/btwPrecheckService";
import QueryKeys from "../../api/queryKeys";
import type {
  BtwPrecheckReportResponse,
  BtwPrecheckPreferencesResponse,
} from "../../api/types/btwPrecheck";

vi.mock("../../api/services/btwPrecheckService", async () => {
  const actual = await vi.importActual<
    typeof import("../../api/services/btwPrecheckService")
  >("../../api/services/btwPrecheckService");
  return {
    ...actual,
    default: {
      getLatestReport: vi.fn(),
      getReport: vi.fn(),
      runPrecheck: vi.fn(),
      getPreferences: vi.fn(),
      updatePreferences: vi.fn(),
    },
  };
});

const mockedService = vi.mocked(btwPrecheckService, true);

const makeReport = (
  overrides: Partial<BtwPrecheckReportResponse["data"]> = {}
): BtwPrecheckReportResponse => ({
  success: true,
  data: {
    _id: "report-1",
    tenantId: "tenant-1",
    periodType: "quarterly",
    period: "Q2",
    year: 2026,
    status: "completed",
    trigger: "manual",
    findings: [],
    meta: { anomalyStatus: "completed" },
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  },
});

describe("useBtwPrecheckLatestReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the latest report for the given period/year", async () => {
    mockedService.getLatestReport.mockResolvedValue(makeReport());

    const { result } = renderHookWithClient(() =>
      useBtwPrecheckLatestReport("Q2", 2026)
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.getLatestReport).toHaveBeenCalledWith("Q2", 2026);
    expect(result.current.data?.data.status).toBe("completed");
  });

});

describe("getBtwPrecheckRefetchInterval", () => {
  it("returns 3000ms when the latest report is running", () => {
    const interval = getBtwPrecheckRefetchInterval({
      state: { data: makeReport({ status: "running" }) },
    });
    expect(interval).toBe(3000);
  });

  it("returns false when the latest report is completed", () => {
    const interval = getBtwPrecheckRefetchInterval({
      state: { data: makeReport({ status: "completed" }) },
    });
    expect(interval).toBe(false);
  });

  it("returns false when there is no report yet (data is null)", () => {
    const interval = getBtwPrecheckRefetchInterval({ state: { data: null } });
    expect(interval).toBe(false);
  });

  it("returns false while the query has not resolved yet (data is undefined)", () => {
    const interval = getBtwPrecheckRefetchInterval({
      state: { data: undefined },
    });
    expect(interval).toBe(false);
  });
});

describe("useRunBtwPrecheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates the latest-report query for the same period/year on success", async () => {
    mockedService.runPrecheck.mockResolvedValue({
      success: true,
      data: { reportId: "report-2", status: "running" },
    });
    mockedService.getLatestReport.mockResolvedValue(makeReport());

    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useRunBtwPrecheck(), {
      client,
    });

    result.current.mutate({ period: "Q2", year: 2026 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QueryKeys.btwPrecheck.latest("Q2", 2026),
    });
  });

  it("surfaces a typed error on 409 via onError", async () => {
    mockedService.runPrecheck.mockRejectedValue(
      new BtwPrecheckAlreadyRunningError()
    );

    const { result } = renderHookWithClient(() => useRunBtwPrecheck());

    let caught: unknown;
    result.current.mutate(
      { period: "Q2", year: 2026 },
      { onError: (error) => (caught = error) }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(caught).toBeInstanceOf(BtwPrecheckAlreadyRunningError);
  });
});

describe("useBtwPrecheckPreferences / useUpdateBtwPrecheckPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makePrefs = (): BtwPrecheckPreferencesResponse => ({
    success: true,
    data: {
      _id: "pref-1",
      userId: "user-1",
      tenantId: "tenant-1",
      emailNotifications: true,
      inAppNotifications: true,
      pushNotifications: false,
      preferredLanguage: "nl",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
  });

  it("fetches preferences", async () => {
    mockedService.getPreferences.mockResolvedValue(makePrefs());

    const { result } = renderHookWithClient(() =>
      useBtwPrecheckPreferences()
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.emailNotifications).toBe(true);
  });

  it("invalidates preferences on update", async () => {
    mockedService.updatePreferences.mockResolvedValue(makePrefs());

    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(
      () => useUpdateBtwPrecheckPreferences(),
      { client }
    );

    result.current.mutate({ pushNotifications: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QueryKeys.btwPrecheck.preferences(),
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/__tests__/hooks/useBtwPrecheck.test.tsx`
Expected: FAIL — cannot find module `../../hooks/useBtwPrecheck`.

- [ ] **Step 4: Write the hooks implementation**

`src/hooks/useBtwPrecheck.ts`:

```ts
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";

import btwPrecheckService from "../api/services/btwPrecheckService";
import QueryKeys from "../api/queryKeys";
import {
  BtwPrecheckPreferencesResponse,
  BtwPrecheckPreferencesUpdateRequest,
  BtwPrecheckReportResponse,
  RunBtwPrecheckRequest,
} from "../api/types/btwPrecheck";

/**
 * Poll every 3 seconds while the latest report is running, otherwise don't
 * poll. Extracted as a standalone function so it can be unit-tested directly
 * against a plain { state: { data } } shape, without driving fake timers
 * through TanStack Query's own refetch scheduling.
 */
export function getBtwPrecheckRefetchInterval(query: {
  state: { data?: BtwPrecheckReportResponse | null };
}): number | false {
  const status = query.state.data?.data?.status;
  return status === "running" ? 3000 : false;
}

export const useBtwPrecheckLatestReport = (
  period: string,
  year: number
): UseQueryResult<BtwPrecheckReportResponse | null, Error> => {
  return useQuery({
    queryKey: QueryKeys.btwPrecheck.latest(period, year),
    queryFn: () => btwPrecheckService.getLatestReport(period, year),
    refetchInterval: getBtwPrecheckRefetchInterval,
  });
};

export const useRunBtwPrecheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RunBtwPrecheckRequest) =>
      btwPrecheckService.runPrecheck(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.btwPrecheck.latest(
          variables.period,
          variables.year
        ),
      });
    },
  });
};

export const useBtwPrecheckPreferences = (): UseQueryResult<
  BtwPrecheckPreferencesResponse,
  Error
> => {
  return useQuery({
    queryKey: QueryKeys.btwPrecheck.preferences(),
    queryFn: () => btwPrecheckService.getPreferences(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useUpdateBtwPrecheckPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BtwPrecheckPreferencesUpdateRequest) =>
      btwPrecheckService.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.btwPrecheck.preferences(),
      });
    },
  });
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/hooks/useBtwPrecheck.test.tsx`
Expected: PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
npm run typecheck
git add src/api/queryKeys.ts src/hooks/useBtwPrecheck.ts src/__tests__/hooks/useBtwPrecheck.test.tsx
git commit -m "feat(btw-precheck): add query keys and TanStack Query hooks"
```

---

### Task 4: Settings type extension + Instellingen card

**Files:**
- Modify: `src/api/types/settings.ts` (add `btwPrecheck` to `Settings` and `SettingsUpdateRequest`)
- Create: `src/components/BtwPrecheckSettingsCard/index.tsx`
- Test: `src/__tests__/components/BtwPrecheckSettingsCard.test.tsx`

**Interfaces:**
- Consumes: `useSettings` (existing, `src/hooks/useSettings.ts`: `getSettings()` returns `UseQueryResult<SettingsResponse, Error>`, `updateSettings` is a `useMutation` object with `.mutate(data: SettingsUpdateRequest)`), `useBtwPrecheckPreferences`/`useUpdateBtwPrecheckPreferences` (Task 3).
- Produces: `BtwPrecheckSettingsCard` React component (no props), default export. Used by Task 7 (Taxes page).

- [ ] **Step 1: Extend the Settings types**

In `src/api/types/settings.ts`, add to the `Settings` interface (after `website: string;`):

```ts
  btwPrecheck?: {
    missingDocuments: boolean;
    vatArithmetic: boolean;
    duplicates: boolean;
    historyAnomalies: boolean;
  };
```

And to `SettingsUpdateRequest` (after `companyLogo?: string;`):

```ts
  btwPrecheck?: {
    missingDocuments: boolean;
    vatArithmetic: boolean;
    duplicates: boolean;
    historyAnomalies: boolean;
  };
```

- [ ] **Step 2: Write the failing test**

`src/__tests__/components/BtwPrecheckSettingsCard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "../test-utils";
import BtwPrecheckSettingsCard from "../../components/BtwPrecheckSettingsCard";

const mockGetSettings = vi.fn();
const mockUpdateSettingsMutate = vi.fn();
const mockUseBtwPrecheckPreferences = vi.fn();
const mockUpdatePrefsMutate = vi.fn();

vi.mock("../../hooks/useSettings", () => ({
  default: () => ({
    getSettings: mockGetSettings,
    updateSettings: { mutate: mockUpdateSettingsMutate },
  }),
}));

vi.mock("../../hooks/useBtwPrecheck", () => ({
  useBtwPrecheckPreferences: () => mockUseBtwPrecheckPreferences(),
  useUpdateBtwPrecheckPreferences: () => ({
    mutate: mockUpdatePrefsMutate,
  }),
}));

const makeSettingsResponse = (btwPrecheck?: {
  missingDocuments: boolean;
  vatArithmetic: boolean;
  duplicates: boolean;
  historyAnomalies: boolean;
}) => ({
  success: true,
  data: {
    _id: "settings-1",
    country: "Nederland",
    currency: "EUR",
    companyName: "Acme",
    street: "Hoofdstraat",
    houseNumber: "1",
    postalCode: "1000AA",
    city: "Amsterdam",
    phoneNumber: "0600000000",
    companyEmail: "acme@example.com",
    taxNumber: "NL000000000B01",
    chamberOfCommerceNumber: "12345678",
    bankName: "ING",
    bankIBAN: "NL00INGB0000000000",
    taxPercentage: "21",
    createdAt: "2026-01-01T00:00:00.000Z",
    tenantId: "tenant-1",
    __v: 0,
    agbCode: "",
    companyLogo: "",
    registerNumber: "",
    website: "",
    btwPrecheck,
  },
});

const makePrefsResponse = (overrides = {}) => ({
  success: true,
  data: {
    _id: "pref-1",
    userId: "user-1",
    tenantId: "tenant-1",
    emailNotifications: true,
    inAppNotifications: true,
    pushNotifications: false,
    preferredLanguage: "nl" as const,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  },
});

describe("BtwPrecheckSettingsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockReturnValue({
      data: makeSettingsResponse({
        missingDocuments: true,
        vatArithmetic: true,
        duplicates: false,
        historyAnomalies: true,
      }),
      isLoading: false,
    });
    mockUseBtwPrecheckPreferences.mockReturnValue({
      data: makePrefsResponse(),
      isLoading: false,
    });
  });

  it("renders all four check toggles with their current values", () => {
    renderWithProviders(<BtwPrecheckSettingsCard />);
    expect(screen.getByText("Ontbrekende documenten")).toBeInTheDocument();
    expect(screen.getByText("BTW-rekenfouten")).toBeInTheDocument();
    expect(screen.getByText("Mogelijke duplicaten")).toBeInTheDocument();
    expect(screen.getByText("Afwijkingen in geschiedenis")).toBeInTheDocument();
  });

  it("defaults check toggles to true when settings.btwPrecheck is undefined", () => {
    mockGetSettings.mockReturnValue({
      data: makeSettingsResponse(undefined),
      isLoading: false,
    });
    renderWithProviders(<BtwPrecheckSettingsCard />);
    const toggle = screen.getByTestId("toggle-missingDocuments");
    expect(toggle).toHaveAttribute("checked");
  });

  it("updates settings with the toggled check merged into the existing four", async () => {
    renderWithProviders(<BtwPrecheckSettingsCard />);
    const toggle = screen.getByTestId("toggle-duplicates");
    await userEvent.click(toggle);

    expect(mockUpdateSettingsMutate).toHaveBeenCalledWith({
      btwPrecheck: {
        missingDocuments: true,
        vatArithmetic: true,
        duplicates: true,
        historyAnomalies: true,
      },
    });
  });

  it("renders all three notification-channel toggles", () => {
    renderWithProviders(<BtwPrecheckSettingsCard />);
    expect(screen.getByText("E-mail")).toBeInTheDocument();
    expect(screen.getByText("In-app")).toBeInTheDocument();
    expect(screen.getByText("Push")).toBeInTheDocument();
  });

  it("updates notification preferences when a channel toggle is changed", async () => {
    renderWithProviders(<BtwPrecheckSettingsCard />);
    const toggle = screen.getByTestId("toggle-pushNotifications");
    await userEvent.click(toggle);

    expect(mockUpdatePrefsMutate).toHaveBeenCalledWith({
      pushNotifications: true,
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/__tests__/components/BtwPrecheckSettingsCard.test.tsx`
Expected: FAIL — cannot find module `../../components/BtwPrecheckSettingsCard`.

- [ ] **Step 4: Write the component**

`src/components/BtwPrecheckSettingsCard/index.tsx`:

```tsx
import React from "react";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonToggle,
} from "@ionic/react";

import useSettings from "../../hooks/useSettings";
import {
  useBtwPrecheckPreferences,
  useUpdateBtwPrecheckPreferences,
} from "../../hooks/useBtwPrecheck";

interface CheckToggles {
  missingDocuments: boolean;
  vatArithmetic: boolean;
  duplicates: boolean;
  historyAnomalies: boolean;
}

const DEFAULT_CHECKS: CheckToggles = {
  missingDocuments: true,
  vatArithmetic: true,
  duplicates: true,
  historyAnomalies: true,
};

const CHECK_LABELS: Array<{ key: keyof CheckToggles; label: string }> = [
  { key: "missingDocuments", label: "Ontbrekende documenten" },
  { key: "vatArithmetic", label: "BTW-rekenfouten" },
  { key: "duplicates", label: "Mogelijke duplicaten" },
  { key: "historyAnomalies", label: "Afwijkingen in geschiedenis" },
];

const BtwPrecheckSettingsCard: React.FC = () => {
  const { getSettings, updateSettings } = useSettings();
  const settingsQuery = getSettings();
  const { data: prefsData } = useBtwPrecheckPreferences();
  const updatePrefs = useUpdateBtwPrecheckPreferences();

  const checks: CheckToggles = {
    ...DEFAULT_CHECKS,
    ...settingsQuery.data?.data.btwPrecheck,
  };

  const handleCheckToggle = (key: keyof CheckToggles, checked: boolean) => {
    updateSettings.mutate({
      btwPrecheck: { ...checks, [key]: checked },
    });
  };

  const prefs = prefsData?.data;

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>BTW Pre-Check Instellingen</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <h3>Controles</h3>
        {CHECK_LABELS.map(({ key, label }) => (
          <IonItem key={key} lines="none">
            <IonLabel>{label}</IonLabel>
            <IonToggle
              data-testid={`toggle-${key}`}
              checked={checks[key]}
              onIonChange={(e) => handleCheckToggle(key, e.detail.checked)}
            />
          </IonItem>
        ))}

        <h3>Meldingen</h3>
        <IonItem lines="none">
          <IonLabel>E-mail</IonLabel>
          <IonToggle
            data-testid="toggle-emailNotifications"
            checked={prefs?.emailNotifications ?? true}
            onIonChange={(e) =>
              updatePrefs.mutate({ emailNotifications: e.detail.checked })
            }
          />
        </IonItem>
        <IonItem lines="none">
          <IonLabel>In-app</IonLabel>
          <IonToggle
            data-testid="toggle-inAppNotifications"
            checked={prefs?.inAppNotifications ?? true}
            onIonChange={(e) =>
              updatePrefs.mutate({ inAppNotifications: e.detail.checked })
            }
          />
        </IonItem>
        <IonItem lines="none">
          <IonLabel>Push</IonLabel>
          <IonToggle
            data-testid="toggle-pushNotifications"
            checked={prefs?.pushNotifications ?? false}
            onIonChange={(e) =>
              updatePrefs.mutate({ pushNotifications: e.detail.checked })
            }
          />
        </IonItem>
      </IonCardContent>
    </IonCard>
  );
};

export default BtwPrecheckSettingsCard;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/components/BtwPrecheckSettingsCard.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
npm run typecheck
git add src/api/types/settings.ts src/components/BtwPrecheckSettingsCard src/__tests__/components/BtwPrecheckSettingsCard.test.tsx
git commit -m "feat(btw-precheck): add check-type and notification toggle card"
```

---

### Task 5: Report card (states, run-now, tap-through findings)

**Files:**
- Create: `src/components/BtwPrecheckReportCard/index.tsx`
- Test: `src/__tests__/components/BtwPrecheckReportCard.test.tsx`

**Interfaces:**
- Consumes: `useBtwPrecheckLatestReport`, `useRunBtwPrecheck`, `BtwPrecheckAlreadyRunningError`, `BtwPrecheckDailyCapReachedError` (Task 2/3), `useToast` (existing, `src/hooks/useToast.tsx`: `{ showToast: (message: string, type: "error"|"success"|"info") => void }`), `useHistory` from `react-router-dom`.
- Produces: `BtwPrecheckReportCard` React component, props `{ period: "Q1"|"Q2"|"Q3"|"Q4"; year: number }`, default export. Used by Task 7 (Taxes page).

- [ ] **Step 1: Write the failing test**

`src/__tests__/components/BtwPrecheckReportCard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "../test-utils";
import { ToastProvider } from "../../contexts/ToastContext";
import BtwPrecheckReportCard from "../../components/BtwPrecheckReportCard";
import {
  BtwPrecheckAlreadyRunningError,
  BtwPrecheckDailyCapReachedError,
} from "../../api/services/btwPrecheckService";
import type { Finding } from "../../api/types/btwPrecheck";

const push = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useHistory: () => ({ push }) };
});

const mockUseBtwPrecheckLatestReport = vi.fn();
const mockMutate = vi.fn();

vi.mock("../../hooks/useBtwPrecheck", () => ({
  useBtwPrecheckLatestReport: (...args: unknown[]) =>
    mockUseBtwPrecheckLatestReport(...args),
  useRunBtwPrecheck: () => ({ mutate: mockMutate, isPending: false }),
}));

const finding = (overrides: Partial<Finding> = {}): Finding => ({
  code: "MISSING_DOCUMENT",
  severity: "warning",
  messageNl: "Uitgave #1001 heeft geen bon.",
  messageEn: "Expense #1001 has no receipt.",
  entityType: "expense",
  entityId: "exp-1",
  meta: {},
  ...overrides,
});

const makeReport = (overrides = {}, findings: Finding[] = []) => ({
  data: {
    success: true,
    data: {
      _id: "report-1",
      tenantId: "tenant-1",
      periodType: "quarterly" as const,
      period: "Q2" as const,
      year: 2026,
      status: "completed" as const,
      trigger: "manual" as const,
      findings,
      meta: { anomalyStatus: "completed" as const },
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      ...overrides,
    },
  },
  isLoading: false,
  isError: false,
  error: null,
});

const renderCard = () =>
  renderWithProviders(
    <ToastProvider>
      <BtwPrecheckReportCard period="Q2" year={2026} />
    </ToastProvider>
  );

describe("BtwPrecheckReportCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a spinner while loading", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    const { container } = renderCard();
    expect(container.querySelector("ion-spinner")).not.toBeNull();
  });

  it("shows the empty state when no report exists yet", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });
    renderCard();
    expect(
      screen.getByText("Nog geen controle uitgevoerd voor dit kwartaal.")
    ).toBeInTheDocument();
  });

  it("shows a running message when status is running", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({ status: "running" })
    );
    renderCard();
    expect(screen.getByText("Bezig met controleren...")).toBeInTheDocument();
  });

  it("shows a failed message when status is failed", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({ status: "failed" })
    );
    renderCard();
    expect(
      screen.getByText("De controle is mislukt. Probeer het opnieuw.")
    ).toBeInTheDocument();
  });

  it("shows a clean message when completed with zero findings", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(makeReport({}, []));
    renderCard();
    expect(
      screen.getByText("Geen aandachtspunten gevonden.")
    ).toBeInTheDocument();
  });

  it("lists findings when completed with findings", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({}, [finding()])
    );
    renderCard();
    expect(screen.getByText("Uitgave #1001 heeft geen bon.")).toBeInTheDocument();
  });

  it("navigates to the expense when a tappable expense finding is clicked", async () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({}, [finding({ entityType: "expense", entityId: "exp-1" })])
    );
    renderCard();
    await userEvent.click(screen.getByText("Uitgave #1001 heeft geen bon."));
    expect(push).toHaveBeenCalledWith("/expenses/exp-1");
  });

  it("navigates to the invoice when a tappable invoice finding is clicked", async () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({}, [
        finding({
          entityType: "invoice",
          entityId: "inv-1",
          messageNl: "Factuur #2001 komt mogelijk dubbel voor.",
        }),
      ])
    );
    renderCard();
    await userEvent.click(
      screen.getByText("Factuur #2001 komt mogelijk dubbel voor.")
    );
    expect(push).toHaveBeenCalledWith("/invoices/inv-1");
  });

  it("does not navigate for a period-level finding", async () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({}, [
        finding({
          entityType: "period",
          entityId: null,
          code: "HISTORY_ANOMALY",
          messageNl: "Leverancier Shell ontbreekt dit kwartaal.",
        }),
      ])
    );
    renderCard();
    await userEvent.click(
      screen.getByText("Leverancier Shell ontbreekt dit kwartaal.")
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("calls the run mutation with the given period and year", async () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue(
      makeReport({}, [])
    );
    renderCard();
    await userEvent.click(screen.getByText("Controleer nu"));
    expect(mockMutate).toHaveBeenCalledWith(
      { period: "Q2", year: 2026 },
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });

  it("shows an info toast when a run is already in progress (409)", async () => {
    mockMutate.mockImplementation((_vars, opts) =>
      opts.onError(new BtwPrecheckAlreadyRunningError())
    );
    mockUseBtwPrecheckLatestReport.mockReturnValue(makeReport({}, []));
    renderCard();
    await userEvent.click(screen.getByText("Controleer nu"));
    expect(
      await screen.findByText("Er loopt al een controle voor dit kwartaal.")
    ).toBeInTheDocument();
  });

  it("shows an info toast when the daily cap is reached (429)", async () => {
    mockMutate.mockImplementation((_vars, opts) =>
      opts.onError(new BtwPrecheckDailyCapReachedError())
    );
    mockUseBtwPrecheckLatestReport.mockReturnValue(makeReport({}, []));
    renderCard();
    await userEvent.click(screen.getByText("Controleer nu"));
    expect(
      await screen.findByText(
        "Maximaal aantal handmatige controles per dag bereikt."
      )
    ).toBeInTheDocument();
  });

  it("shows an unavailable message when the backend flag is off (503)", () => {
    mockUseBtwPrecheckLatestReport.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 503 } },
    });
    renderCard();
    expect(
      screen.getByText("BTW pre-check is momenteel niet beschikbaar.")
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/components/BtwPrecheckReportCard.test.tsx`
Expected: FAIL — cannot find module `../../components/BtwPrecheckReportCard`.

- [ ] **Step 3: Write the component**

`src/components/BtwPrecheckReportCard/index.tsx`:

```tsx
import React from "react";
import { useHistory } from "react-router-dom";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonSpinner,
  IonText,
} from "@ionic/react";
import { alertCircleOutline, informationCircleOutline } from "ionicons/icons";
import { AxiosError } from "axios";

import {
  useBtwPrecheckLatestReport,
  useRunBtwPrecheck,
} from "../../hooks/useBtwPrecheck";
import {
  BtwPrecheckAlreadyRunningError,
  BtwPrecheckDailyCapReachedError,
} from "../../api/services/btwPrecheckService";
import { useToast } from "../../hooks/useToast";
import type { Finding } from "../../api/types/btwPrecheck";

interface BtwPrecheckReportCardProps {
  period: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
}

const isTappable = (finding: Finding): boolean =>
  finding.entityId !== null &&
  (finding.entityType === "expense" || finding.entityType === "invoice");

const BtwPrecheckReportCard: React.FC<BtwPrecheckReportCardProps> = ({
  period,
  year,
}) => {
  const history = useHistory();
  const { showToast } = useToast();
  const { data, isLoading, isError, error } = useBtwPrecheckLatestReport(
    period,
    year
  );
  const runMutation = useRunBtwPrecheck();

  const handleFindingClick = (finding: Finding) => {
    if (!isTappable(finding)) return;
    if (finding.entityType === "expense") {
      history.push(`/expenses/${finding.entityId}`);
    } else if (finding.entityType === "invoice") {
      history.push(`/invoices/${finding.entityId}`);
    }
  };

  const handleRunNow = () => {
    runMutation.mutate(
      { period, year },
      {
        onError: (mutationError: Error) => {
          if (mutationError instanceof BtwPrecheckAlreadyRunningError) {
            showToast("Er loopt al een controle voor dit kwartaal.", "info");
          } else if (mutationError instanceof BtwPrecheckDailyCapReachedError) {
            showToast(
              "Maximaal aantal handmatige controles per dag bereikt.",
              "info"
            );
          } else {
            showToast("Kon de controle niet starten.", "error");
          }
        },
      }
    );
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="ion-text-center">
          <IonSpinner />
        </div>
      );
    }

    if (isError) {
      const status = (error as AxiosError)?.response?.status;
      if (status === 503) {
        return (
          <IonText color="medium">
            <p>BTW pre-check is momenteel niet beschikbaar.</p>
          </IonText>
        );
      }
      return (
        <IonText color="danger">
          <p>Kon de controle niet laden.</p>
        </IonText>
      );
    }

    const report = data?.data;

    if (!report) {
      return (
        <>
          <IonText color="medium">
            <p>Nog geen controle uitgevoerd voor dit kwartaal.</p>
          </IonText>
          <IonButton expand="block" onClick={handleRunNow}>
            Controleer nu
          </IonButton>
        </>
      );
    }

    if (report.status === "running") {
      return (
        <>
          <div className="ion-text-center">
            <IonSpinner />
            <p>Bezig met controleren...</p>
          </div>
          <IonButton expand="block" disabled>
            Controleer nu
          </IonButton>
        </>
      );
    }

    if (report.status === "failed") {
      return (
        <>
          <IonText color="danger">
            <p>De controle is mislukt. Probeer het opnieuw.</p>
          </IonText>
          <IonButton expand="block" onClick={handleRunNow}>
            Controleer nu
          </IonButton>
        </>
      );
    }

    return (
      <>
        {report.findings.length === 0 ? (
          <IonText color="medium">
            <p>Geen aandachtspunten gevonden.</p>
          </IonText>
        ) : (
          report.findings.map((finding, index) => {
            const tappable = isTappable(finding);
            return (
              <IonItem
                key={index}
                button={tappable}
                onClick={tappable ? () => handleFindingClick(finding) : undefined}
              >
                <IonIcon
                  slot="start"
                  color={finding.severity === "warning" ? "warning" : "medium"}
                  icon={
                    finding.severity === "warning"
                      ? alertCircleOutline
                      : informationCircleOutline
                  }
                />
                <IonLabel className="ion-text-wrap">
                  {finding.messageNl}
                </IonLabel>
              </IonItem>
            );
          })
        )}
        <IonButton expand="block" onClick={handleRunNow}>
          Controleer nu
        </IonButton>
      </>
    );
  };

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>BTW Pre-Check</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>{renderBody()}</IonCardContent>
    </IonCard>
  );
};

export default BtwPrecheckReportCard;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/components/BtwPrecheckReportCard.test.tsx`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
npm run typecheck
git add src/components/BtwPrecheckReportCard src/__tests__/components/BtwPrecheckReportCard.test.tsx
git commit -m "feat(btw-precheck): add report card with run-now and tap-through findings"
```

---

### Task 6: Notification plumbing (type, navigation, icon)

**Files:**
- Modify: `src/types/notifications.ts:30` (`StoredNotification.type`), `:43` (`NotificationFilter.type`)
- Modify: `src/api/types/notifications.ts:49` (`NotificationListResponse` inline type), `:72` (`MarkAsReadResponse` inline type)
- Modify: `src/services/notification-navigation.service.ts` (add a `"btw_precheck"` case)
- Modify: `src/pages/Notifications/List/index.tsx` (add an icon case in `getNotificationIcon`)
- Test: `src/__tests__/services/notification-navigation.service.test.ts` (add cases to the existing file)

**Interfaces:**
- Consumes: nothing new.
- Produces: `StoredNotification.type` and `NotificationFilter.type` include `"btw_precheck"`; `NotificationNavigationService.navigateFromNotification` pushes `/taxes` for `type: "btw_precheck"`.

- [ ] **Step 1: Extend the type unions**

In `src/types/notifications.ts`, change line 30:

```ts
  type: 'expense' | 'invoice' | 'vat_deadline' | 'general' | 'btw_precheck';
```

And line 43:

```ts
  type?: "expense" | "invoice" | "vat_deadline" | "general" | "btw_precheck";
```

In `src/api/types/notifications.ts`, change the `type` field on both `NotificationListResponse` (line 49) and `MarkAsReadResponse` (line 72):

```ts
    type: 'expense' | 'invoice' | 'vat_deadline' | 'general' | 'btw_precheck';
```

- [ ] **Step 2: Write the failing test (append to the existing navigation-service test file)**

Add this new `describe` block to `src/__tests__/services/notification-navigation.service.test.ts`, right after the `'type: "vat_deadline"'` block:

```ts
  // -------------------------------------------------------------------------
  // btw_precheck
  // -------------------------------------------------------------------------
  describe('type: "btw_precheck"', () => {
    it("always pushes /taxes regardless of action or targetId", () => {
      const variants: Array<Partial<StoredNotification>> = [
        { type: "btw_precheck" },
        { type: "btw_precheck", targetId: "report-1" },
        { type: "btw_precheck", action: "view", targetId: "report-2" },
      ];

      for (const overrides of variants) {
        history = makeHistory();
        NotificationNavigationService.navigateFromNotification(
          baseNotification(overrides),
          history as unknown as History
        );
        expect(history.push).toHaveBeenCalledOnce();
        expect(history.push).toHaveBeenCalledWith("/taxes");
      }
    });
  });
```

Also add `["btw_precheck", { type: "btw_precheck" }]` as a new entry in the `cases` array inside the `"push is called exactly once per invocation"` describe block, right after `["vat_deadline", { type: "vat_deadline" }],`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/__tests__/services/notification-navigation.service.test.ts`
Expected: FAIL — TypeScript error (`"btw_precheck"` is not assignable to `StoredNotification["type"]`) until Step 1's type change and Step 4's service change both land; since Step 1 already happened, this specific run should FAIL only because `navigateFromNotification` still falls through to the `default: general` case, pushing `/dashboard` instead of `/taxes`.

- [ ] **Step 4: Add the navigation case**

In `src/services/notification-navigation.service.ts`, add a new `case` right after the `vat_deadline` case (before `case "general":`):

```ts
      case "btw_precheck":
        history.push("/taxes");
        break;

```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/services/notification-navigation.service.test.ts`
Expected: PASS (all tests, including the 3 new ones)

- [ ] **Step 6: Add the notification-list icon**

In `src/pages/Notifications/List/index.tsx`, add `shieldCheckmarkOutline` to the import from `"ionicons/icons"` (alongside the existing icon imports), and add a case to `getNotificationIcon`:

```ts
      case "btw_precheck":
        return shieldCheckmarkOutline;
```

- [ ] **Step 7: Run the full suite and typecheck**

Run: `npm run test.unit && npm run typecheck`
Expected: all tests PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/types/notifications.ts src/api/types/notifications.ts src/services/notification-navigation.service.ts src/pages/Notifications/List/index.tsx src/__tests__/services/notification-navigation.service.test.ts
git commit -m "feat(btw-precheck): wire notification type, navigation, and icon"
```

---

### Task 7: Wire both cards into the Taxes page

**Files:**
- Modify: `src/pages/Taxes/index.tsx` (add imports and render the two new cards)

**Interfaces:**
- Consumes: `getCurrentReviewPeriod` (Task 1), `BtwPrecheckReportCard` (Task 5), `BtwPrecheckSettingsCard` (Task 4).

- [ ] **Step 1: Add the imports**

In `src/pages/Taxes/index.tsx`, add after the existing `VatReturnDeadlineCard` import:

```tsx
import BtwPrecheckReportCard from "../../components/BtwPrecheckReportCard";
import BtwPrecheckSettingsCard from "../../components/BtwPrecheckSettingsCard";
import { getCurrentReviewPeriod } from "../../utils/btwPeriodUtils";
```

- [ ] **Step 2: Compute the review period and render the cards**

Inside the `TaxesPage` component body, after the `const { showToast } = useToast();` line, add:

```tsx
  const reviewPeriod = getCurrentReviewPeriod();
```

Then, in the JSX, insert the two new cards right after `<VatReturnDeadlineCard variant="full" />` and before the existing "BTW Aangifte Export" `IonCard`:

```tsx
        <BtwPrecheckReportCard
          period={reviewPeriod.period}
          year={reviewPeriod.year}
        />

        <BtwPrecheckSettingsCard />

```

- [ ] **Step 3: Verify the app still builds and existing tests pass**

Run: `npm run typecheck && npm run test.unit`
Expected: no type errors; all existing tests (including `useTaxes.test.tsx`) and all new tests from Tasks 1-6 PASS.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev` (or the project's usual dev-server command), navigate to `/taxes` while logged in against a backend with `BTW_PRECHECK_ENABLED=true`, and confirm:
- The report card and Instellingen card render below the deadline card.
- "Controleer nu" starts a run and the card updates to "Bezig met controleren..." then to the finding list once the backend job completes.
- Toggling a check or notification switch persists after a page reload.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add src/pages/Taxes/index.tsx
git commit -m "feat(btw-precheck): render report and settings cards on the Taxes page"
```

---

## Self-Review Notes (already applied)

- **Spec coverage:** report view + all five states (Task 5), run-now with 409/429/generic handling (Task 5), check-type toggles + notification-channel toggles on one card (Task 4), tap-through to expense/invoice (Task 5), notification deep-link + icon (Task 6), quarter-under-review computed client-side (Task 1), `GET /:id` intentionally left uncalled anywhere (matches the design's explicit deferral). **Not covered here (deliberately, per the design's Out of Scope):** report-history browsing, English rendering, `paperwork-app-native` wiring, VAT-return-preferences editing UI.
- **Placeholder scan:** no TBD/TODO; every step has complete code or an exact command.
- **Type consistency:** `Finding`, `BtwPrecheckReport`, `BtwPrecheckPreferences*` (Task 2) are used identically in Tasks 3, 4, 5 test fixtures and component props — `period`/`year` prop names on `BtwPrecheckReportCard` match what Task 7 passes from `getCurrentReviewPeriod()`'s `ReviewPeriod` shape (Task 1) exactly (`period`/`year` field names line up).
