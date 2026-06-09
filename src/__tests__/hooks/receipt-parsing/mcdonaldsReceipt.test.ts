import { describe, test, expect } from "vitest";
import { TextElement } from "../../../hooks/receipt-parsing/types";
import { RuleResult } from "../../../hooks/receipt-parsing/rules/types";
import { ReceiptRuleEngine } from "../../../hooks/receipt-parsing/rules/ruleEngine";
import { dateRules } from "../../../hooks/receipt-parsing/rules/dateRules";
import { totalRules } from "../../../hooks/receipt-parsing/rules/totalRules";
import { taxRules } from "../../../hooks/receipt-parsing/rules/taxRules";
import { mockTextElements } from "../../mockData/mcdonaldsReceiptMockData";

describe("McDonalds Receipt Tests", () => {
  // Create a configured rule engine for testing
  const createTestRuleEngine = (debugMode = true) => {
    const engine = new ReceiptRuleEngine([], debugMode);
    engine.addRules([...dateRules, ...totalRules, ...taxRules]);
    return engine;
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

    // Get all tax results
    const taxLowResults = results.results.filter((r) => r.field === "taxLow");
    const taxHighResults = results.results.filter((r) => r.field === "taxHigh");

    return { taxLowResults, taxHighResults };
  };

  const detectDateFromText = (elements: TextElement[]) => {
    const engine = createTestRuleEngine(true);
    const results = engine.evaluateRules(elements);
    return results.results.filter((r) => r.field === "date");
  };

  test("should correctly identify the total amount from McDonalds receipt", () => {
    const elements = mockTextElements;
    const totalResults = detectTotalAmount(elements);
    console.log("==TEST== Total results:", JSON.stringify(totalResults));

    // Check that we have a result
    expect(totalResults.length).toBeGreaterThan(0);

    // Log sorting details to understand what's happening
    console.log("==TEST== Sorted total values:");
    totalResults.forEach((result) => {
      console.log(
        `Value: ${result.value}, Confidence: ${result.confidence}, Rule: ${result.ruleId}`
      );
    });

    // Find the result with the highest confidence
    const highestConfidenceResult = totalResults.reduce(
      (prev: RuleResult, curr: RuleResult) => {
        console.log(
          `Comparing: ${prev.value}(${prev.confidence}) vs ${curr.value}(${
            curr.confidence
          }) - Winner: ${
            curr.confidence > prev.confidence ? curr.value : prev.value
          }`
        );
        return curr.confidence > prev.confidence ? curr : prev;
      },
      totalResults[0]
    );

    console.log(
      "==TEST== Selected highest confidence total:",
      highestConfidenceResult
    );

    // Verify the total amount is 37.05
    expect(highestConfidenceResult.value).toBe(37.05);
  });

  test("should correctly identify the BTW values from McDonalds receipt", () => {
    const elements = mockTextElements;
    const { taxLowResults, taxHighResults } = detectTaxValues(elements);

    console.log("==TEST== Low tax values:", JSON.stringify(taxLowResults));
    console.log("==TEST== High tax values:", JSON.stringify(taxHighResults));

    // Check that we have a result for low tax
    expect(taxLowResults.length).toBeGreaterThan(0);

    // Log sorting details to understand what's happening
    console.log("==TEST== Sorted tax low values:");
    taxLowResults.forEach((result) => {
      console.log(
        `Value: ${result.value}, Confidence: ${result.confidence}, Rule: ${result.ruleId}`
      );
    });

    // Find the result with the highest confidence
    const highestConfidenceLowTax = taxLowResults.reduce(
      (prev: RuleResult, curr: RuleResult) => {
        console.log(
          `Comparing: ${prev.value}(${prev.confidence}) vs ${curr.value}(${
            curr.confidence
          }) - Winner: ${
            curr.confidence > prev.confidence ? curr.value : prev.value
          }`
        );
        return curr.confidence > prev.confidence ? curr : prev;
      },
      taxLowResults[0]
    );

    console.log(
      "==TEST== Selected highest confidence low tax:",
      highestConfidenceLowTax
    );

    // Log debugging info for high tax values
    console.log("==TEST== Sorted tax high values:");
    taxHighResults.forEach((result) => {
      console.log(
        `Value: ${result.value}, Confidence: ${result.confidence}, Rule: ${result.ruleId}`
      );
    });

    // Check if our rule with multipleResults has the high tax value
    const btwRule = taxLowResults.find(
      (r) => r.ruleId === "tax_tabular_btw_structure" && r.multipleResults
    );

    let highestConfidenceHighTax;

    if (btwRule && btwRule.multipleResults) {
      // Extract the high tax value from our tabular BTW rule's multipleResults
      const highTaxFromBtwRule = btwRule.multipleResults.find(
        (r) => r.field === "taxHigh"
      );
      console.log(
        "==TEST== High tax from BTW rule multipleResults:",
        highTaxFromBtwRule
      );

      if (highTaxFromBtwRule) {
        highestConfidenceHighTax = highTaxFromBtwRule;
      } else {
        // Fall back to normal selection if no multipleResults high tax found
        highestConfidenceHighTax =
          taxHighResults.length > 0
            ? taxHighResults.reduce(
                (prev: RuleResult, curr: RuleResult) =>
                  curr.confidence > prev.confidence ? curr : prev,
                taxHighResults[0]
              )
            : { value: 0 };
      }
    } else {
      // Fall back to normal selection if no BTW rule found
      highestConfidenceHighTax =
        taxHighResults.length > 0
          ? taxHighResults.reduce(
              (prev: RuleResult, curr: RuleResult) =>
                curr.confidence > prev.confidence ? curr : prev,
              taxHighResults[0]
            )
          : { value: 0 };
    }

    console.log(
      "==TEST== Selected highest confidence high tax:",
      highestConfidenceHighTax
    );

    // Verify the tax values
    expect(highestConfidenceLowTax.value).toBe(3.06);
    expect(highestConfidenceHighTax.value).toBe(0);
  });

  test("should correctly extract the date from McDonalds receipt", () => {
    const elements = mockTextElements;
    const dateResults = detectDateFromText(elements);
    console.log("==TEST== Date results:", JSON.stringify(dateResults));

    // Check that we have a result
    expect(dateResults.length).toBeGreaterThan(0);

    // Find the result with the highest confidence
    const highestConfidenceResult = dateResults.reduce(
      (prev: RuleResult, curr: RuleResult) =>
        curr.confidence > prev.confidence ? curr : prev,
      dateResults[0]
    );

    // Create a Date object for April 6, 2025
    const expectedDate = new Date("2025-04-06T00:00:00.000Z");

    // Get the date part only (ignoring the time) from the result
    const resultDate = new Date(highestConfidenceResult.value);
    const resultDateOnly = new Date(
      resultDate.getFullYear(),
      resultDate.getMonth(),
      resultDate.getDate()
    );

    // Get the date part only from the expected date
    const expectedDateOnly = new Date(
      expectedDate.getFullYear(),
      expectedDate.getMonth(),
      expectedDate.getDate()
    );

    // Verify the date is April 6, 2025
    expect(resultDateOnly.toISOString()).toBe(expectedDateOnly.toISOString());
  });
});
