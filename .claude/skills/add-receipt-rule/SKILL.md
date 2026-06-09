---
name: add-receipt-rule
description: Use when changing receipt/OCR parsing in this project — "add a receipt rule", "parse this receipt", "merchant X isn't detected", "fix date/total/tax detection". Enforces the rule-based + spatial-analysis approach and a fixture-based regression test, since this is the app's highest-regression-risk domain.
---

# Add a receipt-parsing rule

Add or change a rule in the rule-based parser and ship a fixture-based regression
test in the same change. See
[docs/RECEIPT_PARSING.md](../../../docs/RECEIPT_PARSING.md). Read an existing test
first — e.g. `src/__tests__/hooks/receipt-parsing/mcdonaldsReceipt.test.ts` and a
detector test like `totalDetection.test.ts` — and copy the pattern.

## Checklist

1. **Write the failing test first.** Add a `*Receipt.test.ts` (or extend a
   detector test) under `src/__tests__/hooks/receipt-parsing/` using a
   **real-world** receipt fixture. Assert the dates/totals/tax the parser should
   produce. Run `npm run test.unit` and watch it fail for the right reason.
2. **Implement the rule** in the receipt-parsing logic under `src/hooks/`. Use
   spatial analysis (line/column structure), not naive string scanning. Use
   constants for domain values — no magic strings.
3. **Run `npm run test.unit`** — the new test passes and no existing
   receipt-parsing test regresses.
4. Keep parsing logic in the dedicated receipt-parsing area; do not leak it into
   UI components.
