import { describe, test, expect } from "vitest";
import { TextElement, ReceiptInfo } from "../../../hooks/receipt-parsing/types";
import { RuleResult } from "../../../hooks/receipt-parsing/rules/types";
import { ReceiptRuleEngine } from "../../../hooks/receipt-parsing/rules/ruleEngine";
import { dateRules } from "../../../hooks/receipt-parsing/rules/dateRules";
import { totalRules } from "../../../hooks/receipt-parsing/rules/totalRules";
import { taxRules } from "../../../hooks/receipt-parsing/rules/taxRules";
import { mockTextElements } from "../../mockData/expertReceiptMockData";

// Create a configured rule engine for testing
const createTestRuleEngine = (debugMode = true) => {
  const engine = new ReceiptRuleEngine([], debugMode);
  engine.addRules([...dateRules, ...totalRules, ...taxRules]);
  return engine;
};

// Helper function to test the rule engine directly
const detectReceiptInfo = (elements: TextElement[]): ReceiptInfo => {
  const engine = createTestRuleEngine(true);
  return engine.extract(elements);
};

// Helper functions for individual detection tests
const detectTotalAmount = (elements: TextElement[]) => {
  const engine = createTestRuleEngine(true);
  const results = engine.evaluateRules(elements);
  return results.results.filter((r) => r.field === "total");
};

const detectTaxValues = (elements: TextElement[]) => {
  const engine = createTestRuleEngine(true);
  const results = engine.evaluateRules(elements);

  // Process all results and extract values from multipleResults
  const allResults: RuleResult[] = [];

  for (const result of results.results) {
    // Add the main result
    allResults.push(result);

    // Also add any results from multipleResults
    if (result.multipleResults && Array.isArray(result.multipleResults)) {
      for (const subResult of result.multipleResults) {
        // Only add if it's a different field than the parent
        if (subResult.field !== result.field) {
          allResults.push(subResult);
        }
      }
    }
  }

  // Now filter the expanded results
  return {
    lowTax: allResults.filter((r) => r.field === "taxLow"),
    highTax: allResults.filter((r) => r.field === "taxHigh"),
  };
};

const detectDateFromText = (elements: TextElement[]) => {
  const engine = createTestRuleEngine(true);
  const results = engine.evaluateRules(elements);
  return results.results.filter((r) => r.field === "date");
};

/**
 * Test case for the Expert receipt
 * This tests real-world OCR data with European number format (commas as decimal separators)
 */
describe("Expert Receipt Tests", () => {
  // Expected values from the actual receipt (known ground truth)
  const expectedTotal = 799.0;
  const expectedTaxLow = 0;
  const expectedTaxHigh = 138.67;
  const expectedDateStr = "01-05-2025";

  test("rule engine should correctly parse Expert receipt", () => {
    // Use the rule engine to detect receipt info
    const result = detectReceiptInfo(mockTextElements);
    console.log("==TEST== Rule engine result:", JSON.stringify(result));

    // Test the total amount detection
    expect(result.total).toBeCloseTo(expectedTotal, 2);

    // Test tax values
    expect(result.taxLow).toBeCloseTo(expectedTaxLow, 2);
    expect(result.taxHigh).toBeCloseTo(expectedTaxHigh, 2);

    // Check for date extraction - should get the correct date from "01-05-2025"
    expect(result.date).toBeDefined();
    if (result.date) {
      const date = new Date(result.date);
      expect(date.getDate()).toBe(1);
      expect(date.getMonth() + 1).toBe(5); // May (0-indexed)
      expect(date.getFullYear()).toBe(2025);
    }
  });

  test("should correctly identify the total amount from Expert receipt", () => {
    // The total should be detected from "Totaal" or "€ 799,00"
    const totalValues = detectTotalAmount(mockTextElements);
    console.log("==TEST== Total values:", JSON.stringify(totalValues));

    // Should have found the correct total with high confidence
    const correctTotal = totalValues.find(
      (total) =>
        Math.abs(total.value - expectedTotal) < 0.01 && total.confidence > 0.8
    );
    expect(correctTotal).toBeDefined();
    if (correctTotal) {
      expect(correctTotal.value).toBeCloseTo(expectedTotal, 2);
    }
  });

  test("should correctly identify the BTW (tax) from Expert receipt", () => {
    // The tax values from the receipt, especially the line with "21,00% btw over € 660,33"
    const taxValues = detectTaxValues(mockTextElements);
    console.log("==TEST== Tax low values:", JSON.stringify(taxValues.lowTax));
    console.log("==TEST== Tax high values:", JSON.stringify(taxValues.highTax));

    // Either we should have found the low tax value (0) with decent confidence,
    // or we should have not found any low tax values (which implies 0)
    if (taxValues.lowTax.length > 0) {
      // If we found any lowTax values, one of them should be 0
      const correctLowTax = taxValues.lowTax.find(
        (tax) => tax.value === expectedTaxLow && tax.confidence > 0.5
      );
      expect(correctLowTax).toBeDefined();
    } else {
      // Having no lowTax results is also valid since it implies taxLow = 0
      console.log(
        "==TEST== No low tax values found, which is correct for this receipt (implied 0)"
      );
      // Test passes implicitly as we're not expecting anything specific
    }

    // Should have found the high tax value (138,67) with decent confidence
    const correctHighTax = taxValues.highTax.find(
      (tax) =>
        Math.abs(tax.value - expectedTaxHigh) < 0.01 && tax.confidence > 0.5
    );
    expect(correctHighTax).toBeDefined();
    if (correctHighTax) {
      expect(correctHighTax.value).toBeCloseTo(expectedTaxHigh, 2);
    }
  });

  test("should correctly extract the date from Expert receipt", () => {
    // The date is in "01-05-2025" format, near "Datum" text
    // Should handle European date format correctly (DD-MM-YYYY)

    // Extract date rule results
    const dateValues = detectDateFromText(mockTextElements);
    console.log("==TEST== Date values:", JSON.stringify(dateValues));

    // Should have found at least one date with decent confidence
    expect(dateValues.length).toBeGreaterThan(0);

    // Check specifically for our expected date
    const dateMatch = dateValues.find((date) => {
      if (!date.value) return false;
      const dateParts = expectedDateStr.split("-");
      const expectedDay = parseInt(dateParts[0], 10);
      const expectedMonth = parseInt(dateParts[1], 10) - 1; // JavaScript months are 0-indexed
      const expectedYear = parseInt(dateParts[2], 10);

      const dateObj = new Date(date.value);
      return (
        dateObj.getDate() === expectedDay &&
        dateObj.getMonth() === expectedMonth &&
        dateObj.getFullYear() === expectedYear
      );
    });

    // Log all date values we found for debugging
    const allDateTexts = mockTextElements
      .filter((el) => /\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(el.text))
      .map((el) => el.text);
    console.log("==TEST== All date-like texts:", allDateTexts);

    // Should have found the correct date with decent confidence
    expect(dateMatch).toBeDefined();
    if (dateMatch && dateMatch.value) {
      const dateObj = new Date(dateMatch.value);
      expect(dateObj.getDate()).toBe(1);
      expect(dateObj.getMonth() + 1).toBe(5); // May
      expect(dateObj.getFullYear()).toBe(2025);
    }
  });
});
