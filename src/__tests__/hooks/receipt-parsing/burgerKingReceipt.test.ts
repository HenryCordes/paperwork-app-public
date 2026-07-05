import { TextElement } from "../../../hooks/receipt-parsing/types";
import { RuleResult } from "../../../hooks/receipt-parsing/rules/types";
import { mockTextElements } from "../../mockData/burgerKingReceiptMockData";
import { ReceiptRuleEngine } from "../../../hooks/receipt-parsing/rules/ruleEngine";
import { dateRules } from "../../../hooks/receipt-parsing/rules/dateRules";
import { totalRules } from "../../../hooks/receipt-parsing/rules/totalRules";
import { taxRules } from "../../../hooks/receipt-parsing/rules/taxRules";

describe("Burger King Receipt Test Case", () => {
  // Use the mock data from our separate file with complete spatial coordinates
  const textElements: TextElement[] = mockTextElements;

  const createTestRuleEngine = (debugMode = true) => {
    const engine = new ReceiptRuleEngine([], debugMode);
    engine.addRules([...dateRules, ...totalRules, ...taxRules]);
    return engine;
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

  // Set the expected correct values
  const expectedTotal = 22.35;
  const expectedTaxLow = 1.83;

  test("should correctly identify the total from Burger King receipt", () => {
    const potentialTotals = detectTotalAmount(textElements);

    console.log("==TEST== Potential totals:", JSON.stringify(potentialTotals));

    // Check if we have the correct total with high confidence
    const correctTotal = potentialTotals.find(
      (total) => Math.abs(total.value - expectedTotal) < 0.01
    );

    // This test might initially fail, which indicates an issue in the algorithm
    expect(correctTotal).toBeDefined();
    expect(correctTotal?.value).toBeCloseTo(expectedTotal, 2);
    expect(correctTotal?.confidence).toBeGreaterThan(0.8);

    // Verify that 0.15 is NOT identified as the most confident total
    // (this is the current bug)
    const wrongTotal = potentialTotals.find(
      (total) => Math.abs(total.value - 0.15) < 0.01 && total.confidence > 0.9
    );

    // Either we shouldn't find 0.15 as a total, or it should have low confidence
    if (wrongTotal) {
      expect(wrongTotal.confidence).toBeLessThan(correctTotal?.confidence || 1);
    }
  });

  test("should correctly identify the BTW (tax) LAAG from Burger King receipt", () => {
    const { lowTax } = detectTaxValues(textElements);

    console.log("==TEST== Low tax values:", JSON.stringify(lowTax));

    // Check if we have the correct tax amount with good confidence
    const correctTax = lowTax.find(
      (tax) => Math.abs(tax.value - expectedTaxLow) < 0.01
    );

    // This test will help identify if there's an issue in the tax detection
    expect(correctTax).toBeDefined();
    expect(correctTax?.value).toBeCloseTo(expectedTaxLow, 2);
    expect(correctTax?.confidence).toBeGreaterThan(0.8);

    // Test the specific BTW 9% pattern recognition
    // We have "1.83 BTW 9%" in the receipt text which should be strongly detected
    const btwPattern = lowTax.find(
      (tax) =>
        Math.abs(tax.value - expectedTaxLow) < 0.01 && tax.confidence >= 0.9
    );

    expect(btwPattern).toBeDefined();
  });

  test("should correctly extract the date from Burger King receipt", () => {
    // The date is in format "18 May '25"
    // Test handling of this date format

    const dateResults = detectDateFromText(textElements);
    console.log("==TEST== Date results:", JSON.stringify(dateResults));

    // Look for a date result with high confidence
    const highConfidenceDate = dateResults.find(
      (date: { confidence: number }) => date.confidence > 0.8
    );
    expect(highConfidenceDate).toBeDefined();

    if (highConfidenceDate) {
      const date = new Date(highConfidenceDate.value);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(4); // May (0-indexed)
      expect(date.getDate()).toBe(18);
    }
  });

  test("BTW percentage and total relationship should be consistent", () => {
    // The receipt has BTW 9% with a value of 1.83
    // This test verifies if our tax calculation logic is correct

    // Calculate expected tax for a 22.35 total with 9% tax
    // Formula: tax = total - (total / (1 + percentage/100))
    const expectedCalculatedTax = expectedTotal - expectedTotal / (1 + 9 / 100);
    console.log(
      `==TEST== Expected calculated tax at 9%: ${expectedCalculatedTax}`
    );

    // Verify our calculation is close to the actual tax on receipt
    expect(expectedCalculatedTax).toBeCloseTo(expectedTaxLow, 1);

    // Test the tax detection with our calculated values
    const { lowTax } = detectTaxValues(textElements);

    // Find tax values close to our calculation
    const calculatedTaxResult = lowTax.find(
      (tax) => Math.abs(tax.value - expectedCalculatedTax) < 0.5
    );

    // We should find a tax value close to our calculation
    expect(calculatedTaxResult).toBeDefined();

    // Just to demonstrate the complete calculation and help with debugging
    console.log(`==TEST== Receipt total: ${expectedTotal}`);
    console.log(`==TEST== Receipt tax: ${expectedTaxLow}`);
    console.log(
      `==TEST== Tax percentage from receipt total: ${
        (expectedTaxLow / expectedTotal) * 100
      }%`
    );
  });
});
