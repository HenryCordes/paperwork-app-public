// src/__tests__/hooks/receipt-parsing/newStoreReceipt.test.ts
import { describe, test, expect } from "vitest";
import { TextElement, ReceiptInfo } from "../../../hooks/receipt-parsing/types";
import { RuleResult } from "../../../hooks/receipt-parsing/rules/types";
import { ReceiptRuleEngine } from "../../../hooks/receipt-parsing/rules/ruleEngine";
import { dateRules } from "../../../hooks/receipt-parsing/rules/dateRules";
import { totalRules } from "../../../hooks/receipt-parsing/rules/totalRules";
import { taxRules } from "../../../hooks/receipt-parsing/rules/taxRules";
import { mockTextElements } from "../../mockData/albertHeijnXLReceiptMockData";

// Helper functions (same as in kwalitariaReceipt.test.ts)
const createTestRuleEngine = (debugMode = true) => {
  const engine = new ReceiptRuleEngine([], debugMode);
  engine.addRules([...dateRules, ...totalRules, ...taxRules]);
  return engine;
};

const detectReceiptInfo = (elements: TextElement[]): ReceiptInfo => {
  const engine = createTestRuleEngine(true);
  return engine.extract(elements);
};

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
    allResults.push(result);
    if (result.multipleResults && Array.isArray(result.multipleResults)) {
      for (const subResult of result.multipleResults) {
        if (subResult.field !== result.field) {
          allResults.push(subResult);
        }
      }
    }
  }

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
 * Test case for the [Albert Heijn XL] receipt
 */
describe("[Albert Heijn XL] Receipt Tests", () => {
  const expectedTotal = 103.4;
  const expectedTaxLow = 5.52;
  const expectedTaxHigh = 6.34;
  const expectedDay = 31;
  const expectedMonth = 5;
  const expectedYear = 2025;

  // The text elements directly from the import
  const textElements = mockTextElements;

  test("rule engine should correctly parse receipt", () => {
    const result = detectReceiptInfo(textElements);
    console.log("==TEST== Rule engine result:", JSON.stringify(result));

    // Test the total amount detection
    expect(result.total).toBeCloseTo(expectedTotal, 2);

    // Test tax values
    expect(result.taxLow).toBeCloseTo(expectedTaxLow, 2);
    expect(result.taxHigh).toBeCloseTo(expectedTaxHigh, 2);

    // Check for date extraction
    expect(result.date).toBeDefined();
    if (result.date) {
      const date = new Date(result.date);

      expect(date.getDate()).toBe(expectedDay);
      expect(date.getMonth() + 1).toBe(expectedMonth);
      expect(date.getFullYear()).toBe(expectedYear);
    }
  });

  test("should correctly identify the total amount", () => {
    const totalValues = detectTotalAmount(textElements);
    console.log("==TEST== Total values:", JSON.stringify(totalValues));

    const correctTotal = totalValues.find(
      (total) =>
        Math.abs(total.value - expectedTotal) < 0.01 && total.confidence > 0.8
    );

    expect(correctTotal).toBeDefined();
    expect(correctTotal?.value).toBeCloseTo(expectedTotal, 2);
  });

  test("should correctly identify the BTW values", () => {
    const { lowTax, highTax } = detectTaxValues(textElements);

    console.log("==TEST== Low tax values:", JSON.stringify(lowTax));
    console.log("==TEST== High tax values:", JSON.stringify(highTax));

    // Check for low tax
    const lowTaxResult = lowTax.find(
      (tax) =>
        Math.abs(tax.value - expectedTaxLow) < 0.01 && tax.confidence > 0.8
    );
    expect(lowTaxResult).toBeDefined();

    // Check for high tax (if expected to be found)
    if (expectedTaxHigh > 0) {
      const highTaxResult = highTax.find(
        (tax) =>
          Math.abs(tax.value - expectedTaxHigh) < 0.01 && tax.confidence > 0.8
      );
      expect(highTaxResult).toBeDefined();
    }
  });

  test("should correctly extract the date", () => {
    // Get all date results
    const dateResults = detectDateFromText(textElements);
    console.log("==TEST== Date results:", JSON.stringify(dateResults));

    // Look for a date result with high confidence
    const highConfidenceDate = dateResults.find(
      (date) => date.confidence > 0.8
    );
    expect(highConfidenceDate).toBeDefined();

    if (highConfidenceDate) {
      const date = new Date(highConfidenceDate.value);
      expect(date.getDate()).toBe(expectedDay);
      expect(date.getMonth() + 1).toBe(expectedMonth);
      expect(date.getFullYear()).toBe(expectedYear);
    }
  });
});
