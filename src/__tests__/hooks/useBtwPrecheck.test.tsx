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
