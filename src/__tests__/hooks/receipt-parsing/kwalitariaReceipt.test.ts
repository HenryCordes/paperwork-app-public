import { describe, test, expect } from "vitest";
import { TextElement, ReceiptInfo } from "../../../hooks/receipt-parsing/types";
import { RuleResult } from "../../../hooks/receipt-parsing/rules/types";
import { ReceiptRuleEngine } from "../../../hooks/receipt-parsing/rules/ruleEngine";
import { dateRules } from "../../../hooks/receipt-parsing/rules/dateRules";
import { totalRules } from "../../../hooks/receipt-parsing/rules/totalRules";
import { taxRules } from "../../../hooks/receipt-parsing/rules/taxRules";
import { mockTextElements } from "../../mockData/kwalitariaReceiptMockData";

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
 * Test case for the Kwalitaria Zutphen receipt
 * This tests real-world OCR data with European number format (commas as decimal separators)
 */
describe("Kwalitaria Receipt Tests", () => {
  // Expected values from the actual receipt (known ground truth)
  const expectedTotal = 40.65;
  const expectedTaxLow = 3.36;
  const expectedTaxHigh = 0;

  // Create text elements with positions similar to how they would appear in OCR
  const textElements: TextElement[] = mockTextElements.map((el) => ({
    text: el.text,
    topLeft: el.topLeft,
    topRight: el.topRight,
    bottomLeft: el.bottomLeft,
    bottomRight: el.bottomRight,
  }));

  test("rule engine should correctly parse Kwalitaria receipt", () => {
    // Use the rule engine to detect receipt info
    const result = detectReceiptInfo(textElements);
    console.log("==TEST== Rule engine result:", JSON.stringify(result));

    // Test the total amount detection
    expect(result.total).toBeCloseTo(expectedTotal, 2);

    // Test tax values
    expect(result.taxLow).toBeCloseTo(expectedTaxLow, 2);
    expect(result.taxHigh).toBeCloseTo(expectedTaxHigh, 2);

    // Check for date extraction - should get the correct date from "Datum/Tijd: 04-05-2025 16:51"
    expect(result.date).toBeDefined();
    if (result.date) {
      const date = new Date(result.date);
      expect(date.getDate()).toBe(4);
      expect(date.getMonth() + 1).toBe(5); // May (0-indexed)
      expect(date.getFullYear()).toBe(2025);
    }
  });

  test("should correctly identify the total amount from Kwalitaria receipt", () => {
    // The total should be detected from "40,65" at the end
    const totalValues = detectTotalAmount(textElements);
    console.log("==TEST== Total values:", JSON.stringify(totalValues));

    // Should have found the correct total with high confidence
    const correctTotal = totalValues.find(
      (total) =>
        Math.abs(total.value - expectedTotal) < 0.01 && total.confidence > 0.8
    );

    expect(correctTotal).toBeDefined();
    expect(correctTotal?.value).toBeCloseTo(expectedTotal, 2);
  });

  test("should correctly identify the BTW values from Kwalitaria receipt", () => {
    const { lowTax, highTax } = detectTaxValues(textElements);

    console.log("==TEST== Low tax values:", JSON.stringify(lowTax));
    console.log("==TEST== High tax values:", JSON.stringify(highTax));

    // Check if we have identified the BTW LAAG value (should be 3,36)
    const lowTaxResult = lowTax.find(
      (tax) =>
        Math.abs(tax.value - expectedTaxLow) < 0.01 && tax.confidence > 0.8
    );
    expect(lowTaxResult).toBeDefined();

    // Check that no high tax was detected or if it was, it should be 0
    if (highTax.length > 0) {
      const highestConfidenceHighTax = highTax.reduce(
        (prev, current) =>
          current.confidence > prev.confidence ? current : prev
      );

      if (highestConfidenceHighTax.confidence > 0.8) {
        expect(highestConfidenceHighTax.value).toBeCloseTo(0, 2);
      }
    }
  });

  test("should correctly extract the date from Kwalitaria receipt", () => {
    // The date is in the format "04-05-2025" in "Datum/Tijd: 04-05-2025 16:51"

    // Extract the text element with the date
    const dateElement = textElements.find((el) =>
      el.text.includes("Datum/Tijd:")
    );
    expect(dateElement).toBeDefined();

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
      expect(date.getDate()).toBe(4);
      expect(date.getMonth() + 1).toBe(5); // May (0-indexed)
      expect(date.getFullYear()).toBe(2025);
    }
  });
});
