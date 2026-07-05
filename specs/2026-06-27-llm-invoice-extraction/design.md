# LLM-Based Invoice/Receipt Extraction — Mobile Wiring

**Date:** 2026-06-27
**Status:** Approved (design); implementation plan pending
**Branch:** `feat/llm-invoice-extraction` (matching branch, same name, in the `paperwork` backend repo)
**Goal:** Add a minimal, flag-gated path in the existing scan flow that calls the new backend LLM extraction endpoint instead of on-device OCR + the rule engine, so the user can manually validate the feature end-to-end by scanning a real receipt on-device — without touching the review modal or save flow.

## Context

This is the mobile half of the backend design at `paperwork/specs/2026-06-27-llm-invoice-extraction/design.md`, which defines `POST /api/invoices/scan`: multipart upload of `image/jpeg`/`image/png`, returns `{ fileLocation, extraction: { vendor, invoiceDate, currency, subtotal, vatBreakdown, vatAmount, total, lineItems }, confidence, validation: { warnings }, needsReview, meta }`. That endpoint does not persist anything — it mirrors today's mobile flow (extract → user reviews/edits → client persists via the existing `POST /api/expense`).

Today's scan flow lives in `src/hooks/useScan.ts`: `DocumentScanner.scanDocument()` captures and crops the image (always writes `.jpg`, regardless of device camera format settings), `Ocr.detectText()` runs on-device OCR, and the rule engine (`src/hooks/receipt-parsing/`) extracts `{ date, total, taxLow, taxHigh }` into a `ReceiptInfo`. The returned `ScanResult` (`imageUrl`, `imagePath`, `receiptInfo`, `rawText`, `rawTextElements`, `parsingMethod`) is consumed entirely within `src/pages/Expenses/Edit/index.tsx`: the review modal (`applyScannedValues`) reads only `receiptInfo`'s four fields plus `rawText[0]` (used as a vendor-name placeholder for both the `info` field and the generated filename); `handleSubmit` uploads `selectedFile` via `documentsService.uploadDocument()` and saves the expense.

Critically, **none of that downstream code needs to change** — if the LLM path produces a `ScanResult` with the same shape, the review modal and save flow work unmodified.

## Decisions

- **Confined to `useScan.ts` plus one new service file.** No changes to `Expenses/Edit/index.tsx`, the review modal, or the save flow.
- **Toggle pattern mirrors the existing `debugMode`/`useRuleEngine` convention exactly**: env-driven default (`VITE_APP_LLM_EXTRACTION_ENABLED`), an exposed setter, no dedicated settings UI. Consistent with how `useRuleEngine`'s setter is already exposed but not wired to any UI control today.
- **On-device OCR is skipped, not run redundantly, when the flag is on.** `Ocr.detectText()` is never called in the LLM branch — there's no value in running it just to discard the result.
- **LLM fields are mapped down into the existing `ReceiptInfo` shape.** `vendor`/`subtotal`/`lineItems`/full `vatBreakdown` aren't persisted (matching the backend decision not to extend `Expense` yet) but are still useful for manual testing, so they're `console.log`-ed in debug mode rather than discarded — no new UI is built to display them.
- **Double upload accepted.** The new endpoint uploads the image to S3 itself; `handleSubmit`'s separate upload call at save time is left untouched. The same image uploads twice on the LLM path. Acceptable for a flag-gated manual-testing path; revisit if/when this path becomes the default.
- **Image conversion reuses the existing technique**, not a new one: `fetch(Capacitor.convertFileSrc(imagePath)).then(r => r.blob())` → `File`, exactly as already done in `Expenses/Edit/index.tsx:242`, just invoked from inside the hook instead of the page component.

## Design

### `src/api/services/invoiceExtractionService.ts` (new)

Mirrors `documentsService.ts` exactly: same `axiosInstance`, same multipart `FormData` pattern, same try/catch → `AxiosError<ApiError>` → rethrow-with-message convention.

```ts
export interface VatBreakdownEntry {
  rate: number
  amount: number
}

export interface LineItem {
  description: string
  quantity: number | null
  unitPrice: number | null
  taxRate: number | null
  lineTotal: number
}

export interface InvoiceExtraction {
  vendor: string | null
  invoiceDate: string | null
  currency: string
  subtotal: number | null
  vatBreakdown: VatBreakdownEntry[]
  vatAmount: number | null
  total: number
  lineItems: LineItem[]
}

export interface InvoiceExtractionWarning {
  code: string
  message: string
  field?: string
}

export interface InvoiceScanResult {
  fileLocation: string
  extraction: InvoiceExtraction
  confidence: { overall: number; fields: Record<string, number> }
  validation: { warnings: InvoiceExtractionWarning[] }
  needsReview: boolean
  meta: {
    provider: string
    model: string
    latencyMs: number
    tokensUsed: { input: number; output: number }
  }
}

class InvoiceExtractionService {
  async scanInvoice(file: File): Promise<InvoiceScanResult> {
    // POST multipart to "invoices/scan", field "file" — same shape as
    // documentsService.uploadDocument(), throws Error(message) on failure.
  }
}

export const invoiceExtractionService = new InvoiceExtractionService(axiosInstance)
```

### `src/hooks/useScan.ts` changes

- Add `useLlmExtraction` state + `setUseLlmExtraction`, default `import.meta.env.VITE_APP_LLM_EXTRACTION_ENABLED === "true"`.
- Extend `ScanResult.parsingMethod` union: `"rule-engine" | "legacy" | "llm"`.
- In `scanDocument()`, after `DocumentScanner.scanDocument()` resolves `imagePath`:
  - If `useLlmExtraction`: convert image to `File` (existing fetch/blob technique), call `invoiceExtractionService.scanInvoice(file)`. Map the result to `ReceiptInfo`:
    - `date`: `new Date(extraction.invoiceDate)` if present, else `new Date()`.
    - `total`: `extraction.total`.
    - `taxLow`: sum of `vatBreakdown` entries where `rate === 9`.
    - `taxHigh`: sum of `vatBreakdown` entries where `rate === 21`.
    - `rawText`: `[extraction.vendor ?? "onbekend"]` (keeps the existing filename/`info`-field logic in `Edit/index.tsx` working unchanged, since it reads `rawText[0]`).
    - `rawTextElements`: `undefined` (no OCR coordinates from this path).
    - `parsingMethod`: `"llm"`.
    - In debug mode, `console.log` the full `extraction`, `confidence`, `validation.warnings`, and `meta` (latency/tokens) — this is the only visibility into the richer fields for now.
  - Else: existing on-device OCR + rule engine path, unchanged.
- Return `useLlmExtraction`/`setUseLlmExtraction` from the hook (alongside the existing `useRuleEngine`/`setUseRuleEngine`).

### Environment variable

`VITE_APP_LLM_EXTRACTION_ENABLED` (new, `.env`/`.env.example`), default unset/false — mirrors `VITE_APP_DEBUG_MODE`.

## Edge cases

- Provider/network error on the LLM path → `invoiceExtractionService.scanInvoice` throws; `scanDocument()`'s existing catch block sets `scanError` and returns `null`, same user-facing failure path as today's OCR errors (`Kon niet scannen of geen document gevonden` / scan-error toast).
- `extraction.vendor` is `null` → falls back to `"onbekend"`, identical to today's behavior when OCR text is empty.
- No `vatBreakdown` entries at all (e.g. a 0%-only receipt) → `taxLow`/`taxHigh` both sum to `0`, which is valid input to the existing review modal (it already handles all-zero tax fields today).

## Success criteria

- With `VITE_APP_LLM_EXTRACTION_ENABLED=true` (or `setUseLlmExtraction(true)` called manually), scanning a real receipt calls the backend endpoint, populates the existing review modal with mapped fields, and a normal save (via the existing, unmodified `handleSubmit`) succeeds.
- With the flag off (default), behavior is byte-for-byte identical to today — on-device OCR + rule engine, no network call to the new endpoint.
- Debug-mode console output shows vendor, line items, confidence, and validation warnings for a scanned receipt, sufficient for manual end-to-end validation without any new UI.

## Out of scope (explicit, for follow-up)

- Any review-modal or save-flow UI changes — confidence scores, warnings, vendor, line items are not surfaced to the user, only logged in debug mode.
- A settings-screen toggle for the flag — flipped via env var or directly calling `setUseLlmExtraction` for now, matching how `useRuleEngine` works today.
- Skipping the redundant image upload at save time — accepted as a known inefficiency for this manual-testing path.
- HEIC/HEIF handling — not applicable; the document scanner already normalizes to `.jpg` regardless of device camera format settings (see backend spec's out-of-scope note for the full reasoning).
- Persisting any of the richer extraction fields (`vendor`, `subtotal`, `lineItems`, `currency`) on the `Expense` record — matches the backend decision not to extend that model yet.
