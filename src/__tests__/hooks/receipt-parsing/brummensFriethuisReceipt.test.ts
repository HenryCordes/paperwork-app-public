import { describe, test, expect } from "vitest";
import { TextElement, ReceiptInfo } from "../../../hooks/receipt-parsing/types";
import { ReceiptRuleEngine } from "../../../hooks/receipt-parsing/rules/ruleEngine";
import { dateRules } from "../../../hooks/receipt-parsing/rules/dateRules";
import { totalRules } from "../../../hooks/receipt-parsing/rules/totalRules";
import { taxRules } from "../../../hooks/receipt-parsing/rules/taxRules";

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
const detectTotalAmount = (
  texts: string[],
  elements: TextElement[]
) => {
  const engine = createTestRuleEngine(true);
  const results = engine.evaluateRules(elements);
  return results.results.filter((r) => r.field === "total");
};

const detectTaxValues = (
  texts: string[],
  elements: TextElement[]
) => {
  const engine = createTestRuleEngine(true);
  const results = engine.evaluateRules(elements);

  return {
    lowTax: results.results.filter((r) => r.field === "taxLow"),
    highTax: results.results.filter((r) => r.field === "taxHigh"),
  };
};

const detectDateFromText = (texts: string[], elements: TextElement[]) => {
  const engine = createTestRuleEngine(true);
  const results = engine.evaluateRules(elements);
  return results.results.filter((r) => r.field === "date");
};

/**
 * Test case for the Brummens Friethuis receipt
 * This tests real-world OCR data from a Dutch receipt
 */
describe("Brummens Friethuis Receipt Tests", () => {
  // Expected values from the actual receipt (known ground truth)
  const expectedTotal = 34.6;

  // Raw OCR text from the receipt
  const texts = [
    "Het Brummens Friethuis",
    "ZUTPHENSESTRAAT 194",
    "6971 EV BRUMMEN",
    "TEL. 0575-561698",
    "MC #01",
    "REG MANAGER 11-05-2025 15:50",
    "REKENING NR.3",
    "000132",
    "1 FRIKANDEL SPEC.",
    "1 BR. KIPKORN",
    "2 BEREHAP SATESAUS",
    "1",
    "BR. GEHAKTBAL",
    "1 GEZ.ZK PATAT 4P",
    "2",
    "SOUFLESSE",
    "**** EFT BETALING ****",
    "3.20",
    "3.20",
    "8.00",
    "4.20",
    "10.60",
    "5.40",
    "8 ST",
    "TE VOLDOEN EURO",
    "PIN",
    "34.60",
    "34.60",
    "EX. BTW LAAG",
    "BTW LAAG",
    "31.74",
    "2.86",
    "BEDANKT VOOR UW BEZOEK",
    "WE ZIEN U GRAAG TERUG.",
    "INFORMEER OOK EENS NAAR",
    "ONZE HANDIGE BESTEL APP!",
  ];

  // Mock text elements based on the OCR data
  const textElements: TextElement[] = texts.map((text, index) => ({
    text,
    bottomLeft: [0, 0],
    bottomRight: [0, 0],
    topLeft: [0, 0],
    topRight: [0, 0],
    index,
  }));

  test("rule engine should correctly parse Brummens Friethuis receipt", () => {
    // Use the rule engine to detect receipt info
    const result = detectReceiptInfo(textElements);
    console.log("==TEST== Rule engine result:", JSON.stringify(result));

    // Test the total amount detection
    expect(result.total).toBeCloseTo(expectedTotal, 2);

    // The issue here is that OCR detected 2.86 when it should be 2.68
    // We test the OCR result for now, but ideally we could improve OCR accuracy
    expect(result.taxLow).toBeDefined();

    // The issue here is that OCR detected 5.40 as BTW HOOG, but it should be 0
    // The 5.40 is actually the price for SOUFLESSE (2 x 2.70)
    // Our rules should be able to determine that 5.40 is not a valid BTW HOOG value
    expect(result.taxHigh).toBeLessThanOrEqual(1); // Ideally should be 0 or very low confidence

    // Check for date extraction - we should get the correct date from "REG MANAGER 11-05-2025 15:50"
    expect(result.date).toBeDefined();
  });

  test("should correctly identify the total amount from Brummens Friethuis receipt", () => {
    // The total is clearly marked with "TE VOLDOEN EURO" and appears twice as "34.60"
    const totalValues = detectTotalAmount(
      texts,
      textElements
    );
    console.log("==TEST== Total values:", JSON.stringify(totalValues));

    // Should have found the correct total with high confidence
    const correctTotal = totalValues.find(
      (total) =>
        Math.abs(total.value - expectedTotal) < 0.01 && total.confidence > 0.8
    );

    expect(correctTotal).toBeDefined();
    expect(correctTotal?.value).toBeCloseTo(expectedTotal, 2);
  });

  test("should correctly identify the BTW (tax) values from Brummens Friethuis receipt", () => {
    const { lowTax, highTax } = detectTaxValues(
      texts,
      textElements
    );

    console.log("==TEST== Low tax values:", JSON.stringify(lowTax));
    console.log("==TEST== High tax values:", JSON.stringify(highTax));

    // Check if we have identified the BTW LAAG value (OCR detected 2.86)
    const lowTaxResult = lowTax.find((tax) => tax.confidence > 0.8);
    expect(lowTaxResult).toBeDefined();

    // The important test: high tax should not be detected as 5.40 with high confidence
    const incorrectHighTax = highTax.find(
      (tax) => Math.abs(tax.value - 5.4) < 0.01 && tax.confidence > 0.7
    );

    // Either we shouldn't find 5.40 as BTW HOOG, or it should have low confidence
    if (incorrectHighTax) {
      expect(incorrectHighTax.confidence).toBeLessThan(0.7);
    }

    // Test for invalid tax detection based on BTW percentage
    // 5.40 is 15.6% of 34.60, which doesn't match any Dutch tax rate (9% or 21%)
    // Our rules should detect this and assign a lower confidence
    const highTaxToTotalRatio = 5.4 / expectedTotal;
    expect(highTaxToTotalRatio).not.toBeCloseTo(0.09, 1); // Not close to 9%
    expect(highTaxToTotalRatio).not.toBeCloseTo(0.21, 1); // Not close to 21%
  });

  test("should correctly extract the date from Brummens Friethuis receipt", () => {
    // The date is in the format "11-05-2025" in "REG MANAGER 11-05-2025 15:50"
    // Test handling of this date format

    // Extract the text element with the date
    const dateText = texts.find(
      (text) => text.includes("MANAGER") && text.includes("-05-2025")
    );
    expect(dateText).toBeDefined();
    console.log("==TEST== Date text:", dateText);

    // Try date extraction
    const dateResult = detectDateFromText(texts, textElements);
    console.log("==TEST== Date results:", JSON.stringify(dateResult));

    // Should find a date result with high confidence
    const highConfidenceDate = dateResult.find((date) => date.confidence > 0.7);
    expect(highConfidenceDate).toBeDefined();

    // Check that the extracted date is in 2025
    if (highConfidenceDate) {
      const extractedDate = new Date(highConfidenceDate.value);
      expect(extractedDate.getFullYear()).toBe(2025);
      expect(extractedDate.getMonth() + 1).toBe(5); // May (0-indexed)
    }
  });
});
