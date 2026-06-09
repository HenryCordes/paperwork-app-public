# Receipt Parsing

> Read this when changing OCR/receipt parsing: the rule engine, detectors, or
> merchant-specific handling.

## Approach

- OCR output is processed with a **rule-based** approach. Parsing logic lives in
  the dedicated receipt-parsing area under `src/hooks/` (tests mirror it in
  `src/__tests__/hooks/receipt-parsing/`).
- Use **spatial analysis** to understand receipt structure (line positions,
  columns) rather than naive string scanning.
- Handle different receipt formats with dedicated **detection rules**.
- Parse dates, totals, and tax amounts with **specialized detectors**
  (date / total / tax line matchers).

## Testing (non-negotiable for this domain)

- Every parsing change ships with a fixture-based regression test using a
  **real-world** receipt example, placed in
  `src/__tests__/hooks/receipt-parsing/`.
- Existing tests follow a `*Receipt.test.ts` naming pattern (e.g.
  `mcdonaldsReceipt.test.ts`) plus detector-level tests
  (`dateDetection.test.ts`, `totalDetection.test.ts`, `taxDetection.test.ts`,
  `ruleEngine.test.ts`). Read one before adding a new one.
- Use constants for domain values; no magic strings in detection logic.

The `add-receipt-rule` skill scaffolds a rule + its regression test.
