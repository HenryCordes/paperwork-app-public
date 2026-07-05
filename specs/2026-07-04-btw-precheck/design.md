# BTW Pre-Check — Mobile Wiring

**Date:** 2026-07-04
**Status:** Approved (design); implementation plan pending
**Branch:** `feat/btw-precheck` (matching branch, same name, in the `paperwork` backend repo)
**Goal:** Give the mobile app a full, usable BTW pre-check experience on the existing Taxes page — view the latest report, run a check on demand, toggle which checks run and how you're notified — wired against the backend contract that's already live on `main`.

## Context

This is the mobile half of the backend feature at `paperwork/specs/2026-07-04-btw-precheck/design.md`, which is merged and live. It exposes, under `/api/btw-precheck` (authenticated):

- `POST /run` `{period, year}` → `202 {success, data: {reportId, status: 'running'}}`; `409` if a run for that period is already in progress; `429` beyond 3 manual runs per tenant per day; `503` if `BTW_PRECHECK_ENABLED` is off; `400` on an invalid period.
- `GET /latest?period=&year=` → `200` with the most recent report for that period, or `404`.
- `GET /:id` → `200` with one report, or `404`.
- `GET` / `PUT /preferences` → the current user's notification-channel preferences.

A report is `{_id, tenantId, periodType: 'quarterly', period, year, status: 'running'|'completed'|'failed', trigger: 'scheduled'|'manual', findings: Finding[], meta: {model, tokensUsed, toolCalls, latencyMs, anomalyStatus}, createdAt, updatedAt}`. A `Finding` is `{code, severity: 'warning'|'info', messageNl, messageEn, entityType: 'expense'|'invoice'|'period', entityId: string|null, meta}`. Finding codes: `MISSING_DOCUMENT`, `VAT_ARITHMETIC_MISMATCH`, `VAT_RATE_UNUSUAL`, `DUPLICATE_SUSPECTED`, `HISTORY_ANOMALY`, `NO_ACTIVITY`. The app is Dutch-only today (no i18n wiring exists anywhere in the codebase yet), so every finding and every piece of UI text in this spec uses `messageNl` / Dutch copy — `messageEn` is unused, matching the backend's own current behavior.

Notification-channel preferences (`GET`/`PUT /preferences`) are `{emailNotifications, inAppNotifications, pushNotifications, preferredLanguage}` (booleans + `'nl'|'en'`, only `'nl'` is meaningful today) — the exact shape the mobile app already fetches for the sibling VAT-return-notification feature via `vatNotificationPreferencesService.ts` / `useVatNotificationPreferences.ts`. Check-type toggles (`missingDocuments`, `vatArithmetic`, `duplicates`, `historyAnomalies`, all boolean) live on the tenant's `Settings` document, fetched/updated via the existing `settingsService.ts` / `useSettings.ts`.

**What's already in the app (confirmed by reading the code):**
- `Taxes` page (`src/pages/Taxes/index.tsx`) is where all BTW-related UI lives today: a deadline card, an "Export Instellingen" card (period/year/format pickers + a toggle), and a preview card. New UI follows this exact `IonCard`/`IonItem`/`IonToggle` pattern — no new UI idiom introduced.
- `vatNotificationPreferencesService.ts` + `useVatNotificationPreferences.ts` already exist as the mirror pattern for per-user notification-channel preferences, but have **no editing UI anywhere** — the only consumer is a read-only `VatReturnDeadlineCard`. This spec does build editing UI for the BTW pre-check preferences (per your "full experience" decision), which the VAT-return feature still lacks.
- Push notifications navigate via `NotificationNavigationService.navigateFromNotification`, switching on `StoredNotification.type` (currently `'expense'|'invoice'|'vat_deadline'|'general'`). This needs a `'btw_precheck'` case.
- No client-side quarter/period math exists yet (`src/utils/dateUtils.ts` only has generic date formatting).

## Decisions (from brainstorm)

- **Full experience, not minimal wiring.** Unlike the LLM-invoice-extraction mobile spec (console-log only), this feature's entire point is a user-visible report, so this spec builds the actual report view, run-now button, toggle UI, and notification deep-link — not a stub.
- **Everything lives on the existing Taxes page**, as two new `IonCard`s alongside the existing ones. No new route, no new Settings sub-page.
- **Poll `GET /latest`, never track a `reportId` locally.** Starting a run just invalidates the latest-report query; it refetches, sees `status: 'running'` (the report was just created), and a `refetchInterval` active only while running takes it to completion. `GET /:id` stays in the backend contract for future report-history browsing but isn't called anywhere in this spec.
- **The quarter to show is computed client-side**, mirroring the backend's "most recently ended quarter" rule (`getQuarterUnderReview`), via a new pure helper. This avoids parsing the unrelated `TaxDeadline.label` string or adding a second network call just to learn which period to ask for.
- **Notification tap always opens `/taxes`**, matching the existing `vat_deadline` case exactly. The notification's `targetId` (a specific reportId) is not threaded through to open that exact historical report — the Taxes page always shows the latest report for the computed current period, which coincides with what the notification refers to in the normal case (one scheduled report per tenant per quarter). Wiring a specific-report view is deferred until report history is actually needed.
- **Findings are tappable when they reference an entity.** When `entityId` + `entityType` (`expense`|`invoice`) are present, tapping a finding row navigates to the existing `/expenses/:id` or `/invoices/:id` routes — the report becomes actionable, not just a read-only list. `entityType: 'period'` findings (like `HISTORY_ANOMALY`, `NO_ACTIVITY`) are not tappable.
- **Dutch only.** No language branching anywhere in this spec — see Context above.

## Design

### `src/utils/btwPeriodUtils.ts` (new)

One pure function, mirroring the backend's `getQuarterUnderReview` (the most recently ended quarter: Jan-Mar maps to Q4 of the previous year; otherwise the previous calendar quarter):

```ts
export interface ReviewPeriod {
  period: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
}

export function getCurrentReviewPeriod(now: Date = new Date()): ReviewPeriod {
  const quarterIndex = Math.floor(now.getMonth() / 3); // 0..3, current quarter
  if (quarterIndex === 0) {
    return { period: "Q4", year: now.getFullYear() - 1 };
  }
  const quarters = ["Q1", "Q2", "Q3", "Q4"] as const;
  return { period: quarters[quarterIndex - 1], year: now.getFullYear() };
}
```

### `src/api/types/btwPrecheck.ts` (new)

Mirrors the backend contract exactly:

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

### `src/api/services/btwPrecheckService.ts` (new)

Mirrors `vatNotificationPreferencesService.ts`'s structure and error convention exactly (same `axiosInstance`, throw `Error(message)` on failure):

```ts
class BtwPrecheckService {
  async getLatestReport(
    period: string,
    year: number
  ): Promise<BtwPrecheckReportResponse | null> {
    // GET /btw-precheck/latest?period=&year=; returns null on 404 (no report yet),
    // rethrows any other error.
  }

  async getReport(id: string): Promise<BtwPrecheckReportResponse> {
    // GET /btw-precheck/:id
  }

  async runPrecheck(
    data: RunBtwPrecheckRequest
  ): Promise<RunBtwPrecheckResponse> {
    // POST /btw-precheck/run; on 409/429 rethrow a typed error (see below)
    // so the hook layer can show the right Dutch toast without string-matching.
  }

  async getPreferences(): Promise<BtwPrecheckPreferencesResponse> {
    // GET /btw-precheck/preferences
  }

  async updatePreferences(
    data: BtwPrecheckPreferencesUpdateRequest
  ): Promise<BtwPrecheckPreferencesResponse> {
    // PUT /btw-precheck/preferences
  }
}

export default new BtwPrecheckService();
```

`runPrecheck` distinguishes its error cases by HTTP status (via `AxiosError.response?.status`) and throws one of two typed errors — `BtwPrecheckAlreadyRunningError` (409) or `BtwPrecheckDailyCapReachedError` (429) — rather than a generic `Error(message)`, so the UI layer can branch on error type instead of parsing a Dutch message string.

### `src/api/queryKeys.ts` (modify)

Add a `btwPrecheck` namespace next to `taxes`, following the existing pattern:

```ts
btwPrecheck: {
  base: ["btwPrecheck"] as const,
  latest: (period: string, year: number) =>
    [...QueryKeys.btwPrecheck.base, "latest", period, year] as const,
  preferences: () =>
    [...QueryKeys.btwPrecheck.base, "preferences"] as const,
},
```

### `src/hooks/useBtwPrecheck.ts` (new)

```ts
export const useBtwPrecheckLatestReport = (
  period: string,
  year: number
): UseQueryResult<BtwPrecheckReportResponse | null, Error> => {
  // useQuery, queryKey QueryKeys.btwPrecheck.latest(period, year),
  // refetchInterval: (query) =>
  //   query.state.data?.data?.status === "running" ? 3000 : false
};

export const useRunBtwPrecheck = () => {
  // useMutation(btwPrecheckService.runPrecheck), onSuccess invalidates
  // QueryKeys.btwPrecheck.latest(period, year) for the same args so the
  // report card immediately shows status: "running" and the poll takes over.
};

export const useBtwPrecheckPreferences = (): UseQueryResult<
  BtwPrecheckPreferencesResponse,
  Error
> => {
  // useQuery, queryKey QueryKeys.btwPrecheck.preferences()
};

export const useUpdateBtwPrecheckPreferences = () => {
  // useMutation(btwPrecheckService.updatePreferences), onSuccess invalidates
  // QueryKeys.btwPrecheck.preferences()
};
```

### `src/api/types/settings.ts` + `src/api/services/settingsService.ts` (modify)

Add to `Settings` and `SettingsUpdateRequest`:

```ts
btwPrecheck?: {
  missingDocuments: boolean;
  vatArithmetic: boolean;
  duplicates: boolean;
  historyAnomalies: boolean;
};
```

No service changes needed — `settingsService.updateSettings` already forwards the full request body.

### Taxes page changes (`src/pages/Taxes/index.tsx`)

Two new `IonCard`s, inserted after the existing "Export Instellingen" card, using `getCurrentReviewPeriod()` to compute `{period, year}` once per render (not stored in component state — it only changes when the quarter rolls over, which a remount handles).

**Report card:**
- `useBtwPrecheckLatestReport(period, year)` drives the content. No report yet (`data` is `null`) → an empty-state message ("Nog geen controle uitgevoerd voor dit kwartaal.") plus the run-now button. `status: 'running'` → `IonSpinner` plus "Bezig met controleren...". `status: 'completed'` → finding count + list. `status: 'failed'` → an error message with a retry affordance (the same run-now button).
- Findings render grouped by `severity` (warnings first, then info), each as an `IonItem`: `messageNl` as the label, a small badge/icon keyed off `code`. When `entityId` is set, the item is `button` and its `onClick` pushes to `/expenses/${entityId}` (when `entityType === 'expense'`) or `/invoices/${entityId}` (when `entityType === 'invoice'`); `entityType: 'period'` items render as plain (non-button) `IonItem`s.
- "Controleer nu" `IonButton`, calling `useRunBtwPrecheck().mutate({period, year})`. Disabled while `status === 'running'` or the mutation is pending. On `BtwPrecheckAlreadyRunningError`, show a toast: "Er loopt al een controle voor dit kwartaal." (via the existing `useToast` hook — the report card's own polling will pick up the in-flight run regardless). On `BtwPrecheckDailyCapReachedError`: "Maximaal aantal handmatige controles per dag bereikt." On any other error: the existing generic error-toast pattern used elsewhere on this page.

**Instellingen card:**
- Four `IonToggle`s bound to `settings.btwPrecheck.{missingDocuments,vatArithmetic,duplicates,historyAnomalies}` via `useSettings()`'s existing `getSettings`/`updateSettings`, each `onIonChange` calling `updateSettings.mutate({btwPrecheck: {...current, [key]: e.detail.checked}})`. Labels: "Ontbrekende documenten", "BTW-rekenfouten", "Mogelijke duplicaten", "Afwijkingen in geschiedenis".
- Three `IonToggle`s for `emailNotifications`/`inAppNotifications`/`pushNotifications` via the new `useBtwPrecheckPreferences`/`useUpdateBtwPrecheckPreferences` hooks. Labels: "E-mail", "In-app", "Push".

### Notification plumbing

- `src/types/notifications.ts`: `StoredNotification.type` and `NotificationFilter.type` gain `"btw_precheck"`.
- `src/api/types/notifications.ts`: the two inline `type` unions in `NotificationListResponse` and `MarkAsReadResponse` gain `"btw_precheck"`.
- `src/services/notification-navigation.service.ts`: new `case "btw_precheck": history.push("/taxes"); break;` alongside the existing `vat_deadline` case.
- `src/pages/Notifications/List/index.tsx`: `getNotificationIcon` gets a `case "btw_precheck": return shieldCheckmarkOutline;` (new icon import from `ionicons/icons`, distinct from the four existing icons).

## Edge cases

- No report exists yet for the current period (new tenant, or the scheduled run hasn't fired) → `getLatestReport` resolves `null` on a `404`; the report card shows the empty state, not an error.
- A finding has `entityType: 'expense'`/`'invoice'` but `entityId: null` (shouldn't happen per the backend schema, but the type allows it) → the item renders as non-tappable, same as a `period`-type finding.
- Quarter rollover while the app is open (e.g. left open across midnight on July 1st) → `getCurrentReviewPeriod()` is computed fresh on each render of the Taxes page, not memoized across app lifetime, so navigating back to the page picks up the new quarter. No live in-page transition is built for this.
- Manual run while offline → the existing axios/React Query error handling on this page (network error toast) applies; no new offline handling is introduced.

## Success criteria

- Opening the Taxes page shows the latest pre-check report for the current quarter (or an empty state), with no manual refresh needed.
- Tapping "Controleer nu" starts a run, the card shows a running state, and — once the backend job completes — the findings appear without the user doing anything else.
- Tapping a finding that references an expense or invoice navigates to that record.
- Toggling a check type or a notification channel persists via the existing `Settings`/new preferences endpoints and survives a page reload.
- Tapping a BTW-pre-check push notification opens the Taxes page.
- With the backend flag off (`503` from every route), the report card shows a clear "niet beschikbaar" state rather than an unhandled error — mirroring how the LLM-invoice-extraction mobile wiring degrades when its flag is off.

## Out of scope (explicit, for follow-up)

- A dedicated report-history view (browsing past quarters' reports via `GET /:id`) — deferred until someone needs it; the notification's `targetId` is not wired to it yet.
- English/i18n rendering of `messageEn` — the app has no language-switching infrastructure at all today.
- `paperwork-app-native` (React Native) wiring — separate spec, same slug, in that repo.
- Editing UI for the sibling VAT-return-notification preferences (still has none) — untouched by this spec.
