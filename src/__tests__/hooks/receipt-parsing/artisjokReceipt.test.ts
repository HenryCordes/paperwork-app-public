import { describe, test, expect } from "vitest";
import { TextElement, ReceiptInfo } from "../../../hooks/receipt-parsing/types";
import { RuleResult } from "../../../hooks/receipt-parsing/rules/types";
import { ReceiptRuleEngine } from "../../../hooks/receipt-parsing/rules/ruleEngine";
import { dateRules } from "../../../hooks/receipt-parsing/rules/dateRules";
import { totalRules } from "../../../hooks/receipt-parsing/rules/totalRules";
import { taxRules } from "../../../hooks/receipt-parsing/rules/taxRules";
import { mockTextElements } from "../../mockData/artisjokReceiptMockData";

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
 * Test case for the Artisjok by Chiel receipt
 * This tests real-world OCR data with European number format (commas as decimal separators)
 */
describe("Artisjok Receipt Tests", () => {
  // Expected values from the actual receipt (known ground truth)
  const expectedTotal = 275.5; // € 275,50
  const expectedTaxLow = 21.84; // 21,84
  const expectedTaxHigh = 1.91; // 1,91
  const expectedDate = new Date("2025-05-10"); // 10/05/2025 (European format DD/MM/YYYY)

  // Mock text elements based on the OCR data
  const textElements: TextElement[] = mockTextElements.map((el, index) => ({
    text: el.text,
    bottomLeft: el.bottomLeft,
    bottomRight: el.bottomRight,
    topLeft: el.topLeft,
    topRight: el.topRight,
    index,
  }));

  test("rule engine should correctly parse Artisjok receipt", () => {
    // Use the rule engine to detect receipt info
    const result = detectReceiptInfo(textElements);
    console.log("==TEST== Rule engine result:", JSON.stringify(result));

    // Test the total amount detection
    expect(result.total).toBeCloseTo(expectedTotal, 2);

    // Test tax values
    expect(result.taxLow).toBeCloseTo(expectedTaxLow, 2);
    expect(result.taxHigh).toBeCloseTo(expectedTaxHigh, 2);

    // Check for date extraction - should get the correct date from "10/05/2025 19:2"
    expect(result.date).toBeDefined();
    if (result.date) {
      const date = new Date(result.date);
      expect(date.getDate()).toBe(10);
      expect(date.getMonth() + 1).toBe(5); // May (0-indexed)
      expect(date.getFullYear()).toBe(2025);
    }
  });

  test("should correctly identify the total amount from Artisjok receipt", () => {
    // The total should be detected from "€ 275,50" or "275,50" at the end
    const totalValues = detectTotalAmount(mockTextElements);
    console.log("==TEST== Total values:", JSON.stringify(totalValues));

    // Should have found the correct total with high confidence
    const correctTotal = totalValues.find(
      (total) =>
        Math.abs(total.value - expectedTotal) < 0.01 && total.confidence > 0.8
    );

    expect(correctTotal).toBeDefined();
    expect(correctTotal?.value).toBeCloseTo(expectedTotal, 2);
  });

  test("should correctly identify the BTW (tax) values from Artisjok receipt", () => {
    const { lowTax, highTax } = detectTaxValues(textElements);

    console.log("==TEST== Low tax values:", JSON.stringify(lowTax));
    console.log("==TEST== High tax values:", JSON.stringify(highTax));

    // Check if we have identified the BTW LAAG value (should be 21,84)
    const lowTaxResult = lowTax.find(
      (tax) =>
        Math.abs(tax.value - expectedTaxLow) < 0.01 && tax.confidence > 0.8
    );
    expect(lowTaxResult).toBeDefined();

    // Check if we have identified the BTW HOOG value (should be 1,91)
    const highTaxResult = highTax.find(
      (tax) =>
        Math.abs(tax.value - expectedTaxHigh) < 0.01 && tax.confidence > 0.8
    );
    expect(highTaxResult).toBeDefined();
  });

  test("should correctly extract the date from Artisjok receipt", () => {
    // The date is in the format "10/05/2025" in "10/05/2025 19:2"
    // Should handle European date format correctly (DD/MM/YYYY)

    // Process the mock data to extract receipt info
    const result = detectReceiptInfo(mockTextElements);

    // Check if date was extracted correctly (DD/MM/YYYY format)
    expect(result.date).toBeDefined();
    const extractedDate = new Date(result.date!);
    expect(extractedDate.getDate()).toBe(expectedDate.getDate());
    expect(extractedDate.getMonth()).toBe(expectedDate.getMonth());
    expect(extractedDate.getFullYear()).toBe(expectedDate.getFullYear());
  });

  test("should correctly extract the total amount from Artisjok receipt", () => {
    // Extract receipt info using the mock data
    const result = detectReceiptInfo(mockTextElements);

    // Check if total was extracted correctly
    expect(result.total).toBeCloseTo(expectedTotal, 2);
  });

  test("should correctly extract the tax values from Artisjok receipt", () => {
    // Extract receipt info using the mock data
    const result = detectReceiptInfo(mockTextElements);

    // Check if tax values were extracted correctly
    expect(result.taxLow).toBeCloseTo(expectedTaxLow, 2);
    expect(result.taxHigh).toBeCloseTo(expectedTaxHigh, 2);
  });

  test("should extract all correct values from Artisjok receipt", () => {
    // Extract receipt info using the mock data
    const result = detectReceiptInfo(mockTextElements);

    // Check all extracted values
    const extractedDate = new Date(result.date!);
    expect(extractedDate.getDate()).toBe(expectedDate.getDate());
    expect(extractedDate.getMonth()).toBe(expectedDate.getMonth());
    expect(extractedDate.getFullYear()).toBe(expectedDate.getFullYear());
    expect(result.total).toBeCloseTo(expectedTotal, 2);
    expect(result.taxLow).toBeCloseTo(expectedTaxLow, 2);
    expect(result.taxHigh).toBeCloseTo(expectedTaxHigh, 2);
    const dateText = mockTextElements.find((el) =>
      el.text.includes("/05/2025")
    );
    expect(dateText).toBeDefined();
    console.log("==TEST== Date text:", dateText);

    // Try date extraction
    const dateResult = detectDateFromText(mockTextElements);
    console.log("==TEST== Date results:", JSON.stringify(dateResult));

    // Should find a date result with high confidence
    const highConfidenceDate = dateResult.find((date) => date.confidence > 0.7);
    expect(highConfidenceDate).toBeDefined();

    // Check that the extracted date matches expected format
    if (highConfidenceDate) {
      const extractedDate = new Date(highConfidenceDate.value);
      expect(extractedDate.getFullYear()).toBe(2025);
      expect(extractedDate.getMonth() + 1).toBe(5); // May (0-indexed)
      expect(extractedDate.getDate()).toBe(10); // Should be the 10th day
    }
  });
});
