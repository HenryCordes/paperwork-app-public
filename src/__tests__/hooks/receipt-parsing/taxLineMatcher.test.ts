import { describe, expect, it } from "vitest";
import { isOnSameLine } from "../../../hooks/receipt-parsing/utils/spatialAnalysis";
import type { SameLineOptions } from "../../../hooks/receipt-parsing/utils/spatialAnalysis";
import type { TextElement } from "../../../hooks/receipt-parsing/types";

describe("Tax Line Matcher Tests", () => {
  // Define the tax elements we're trying to match

  // 9% line elements
  const taxLowPercentElement: TextElement = {
    text: "9,00%:",
    topLeft: [0.0508474590908712, 0.3008720927009326],
    topRight: [0.18644067559839433, 0.3008720927009326],
    bottomLeft: [0.0508474590908712, 0.27906976740081146],
    bottomRight: [0.18644067559839433, 0.27906976740081146],
  };

  const taxLowExclusiveElement: TextElement = {
    text: "242,66",
    topLeft: [0.41365599233493816, 0.3038889678482325],
    topRight: [0.5492489149694868, 0.3036690155969215],
    bottomLeft: [0.4134629516990875, 0.2820867985709228],
    bottomRight: [0.5490558743336361, 0.2818668463196118],
  };

  const taxLowValueElement: TextElement = {
    text: "21,84",
    topLeft: [0.6478503559840363, 0.30413238211443616],
    topRight: [0.7495345193954946, 0.30342304375391405],
    bottomLeft: [0.6470756503091231, 0.2837862582309886],
    bottomRight: [0.7487598137205814, 0.28307691987046646],
  };

  // 21% line elements
  const taxHighPercentElement: TextElement = {
    text: "21,00%:",
    topLeft: [0.05, 0.28], // Approximate coordinates, adjusted as needed
    topRight: [0.18, 0.28],
    bottomLeft: [0.05, 0.26],
    bottomRight: [0.18, 0.26],
  };

  const taxHighValueElement1: TextElement = {
    text: "9,09",
    topLeft: [0.46101695066060805, 0.28488372097128145],
    topRight: [0.54576271097781, 0.28488372097128145],
    bottomLeft: [0.46101695066060805, 0.2630813956711603],
    bottomRight: [0.54576271097781, 0.2630813956711603],
  };

  const taxHighValueElement2: TextElement = {
    text: "1,91",
    topLeft: [0.6677966105193651, 0.2863372091180838],
    topRight: [0.752542370836567, 0.2863372091180838],
    bottomLeft: [0.6677966105193651, 0.26453488381796275],
    bottomRight: [0.752542370836567, 0.26453488381796275],
  };

  // Test all methods for the low tax line
  it("should detect 9,00% and 21,84 are on the same line", () => {
    console.log("\n=== TESTING LOW TAX LINE DETECTION ===");

    // Calculate y-coordinate differences for analysis
    const topDiff = Math.abs(
      taxLowPercentElement.topLeft![1] - taxLowValueElement.topLeft![1]
    );
    const midYPercent =
      (taxLowPercentElement.topLeft![1] + taxLowPercentElement.bottomLeft![1]) /
      2;
    const midYValue =
      (taxLowValueElement.topLeft![1] + taxLowValueElement.bottomLeft![1]) / 2;
    const midDiff = Math.abs(midYPercent - midYValue);

    console.log(
      `Tax Low Percent Element: ${JSON.stringify(taxLowPercentElement.text)}`
    );
    console.log(
      `Tax Low Value Element: ${JSON.stringify(taxLowValueElement.text)}`
    );
    console.log(`Top Y diff: ${topDiff.toFixed(6)}`);
    console.log(`Mid Y diff: ${midDiff.toFixed(6)}`);

    // Test with different methods and tolerances
    const methods = ["top", "midpoint", "bottom", "overlap", "combined"];
    const tolerances = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.05];

    methods.forEach((method) => {
      console.log(`\nMethod: ${method}`);
      tolerances.forEach((tolerance) => {
        const onSameLine = isOnSameLine(
          taxLowPercentElement,
          taxLowValueElement,
          {
            method: method as SameLineOptions["method"],
            tolerance,
            permissiveTolerance: tolerance * 1.5,
          }
        );

        console.log(
          `Tolerance: ${tolerance.toFixed(3)}, onSameLine: ${onSameLine}`
        );

        // If using a common tolerance, expect them to be on the same line
        if (method === "combined" && tolerance >= 0.015) {
          expect(onSameLine).toBe(true);
        }
      });
    });
  });

  // Test for the low tax percentage and the amount on receipt
  it("should determine if 9,00% and 242,66 are on the same line", () => {
    console.log("\n=== TESTING LOW TAX PERCENTAGE AND AMOUNT ===");

    // Calculate differences
    const topDiff = Math.abs(
      taxLowPercentElement.topLeft![1] - taxLowExclusiveElement.topLeft![1]
    );
    const midYPercent =
      (taxLowPercentElement.topLeft![1] + taxLowPercentElement.bottomLeft![1]) /
      2;
    const midYAmount =
      (taxLowExclusiveElement.topLeft![1] +
        taxLowExclusiveElement.bottomLeft![1]) /
      2;
    const midDiff = Math.abs(midYPercent - midYAmount);

    console.log(
      `Tax Low Percent Element: ${JSON.stringify(taxLowPercentElement.text)}`
    );
    console.log(
      `Tax Low Amount Element: ${JSON.stringify(taxLowExclusiveElement.text)}`
    );
    console.log(`Top Y diff: ${topDiff.toFixed(6)}`);
    console.log(`Mid Y diff: ${midDiff.toFixed(6)}`);

    // Test with combined method
    const onSameLine = isOnSameLine(
      taxLowPercentElement,
      taxLowExclusiveElement,
      {
        method: "combined",
        tolerance: 0.015,
        permissiveTolerance: 0.025,
      }
    );

    console.log(`onSameLine (combined, 0.015): ${onSameLine}`);

    // Test which method works best
    const methods = ["top", "midpoint", "bottom", "overlap", "combined"];
    const tolerances = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.05];

    methods.forEach((method) => {
      console.log(`\nMethod: ${method}`);
      tolerances.forEach((tolerance) => {
        const onSameLine = isOnSameLine(
          taxLowPercentElement,
          taxLowExclusiveElement,
          {
            method: method as SameLineOptions["method"],
            tolerance,
            permissiveTolerance: tolerance * 1.5,
          }
        );

        console.log(
          `Tolerance: ${tolerance.toFixed(3)}, onSameLine: ${onSameLine}`
        );
      });
    });
  });

  // Test all methods for the high tax line
  it("should detect 21,00% and its tax values are on the same line", () => {
    console.log("\n=== TESTING HIGH TAX LINE DETECTION ===");

    // Calculate y-coordinate differences for analysis
    const topDiff1 = Math.abs(
      taxHighPercentElement.topLeft![1] - taxHighValueElement1.topLeft![1]
    );
    const midYPercent =
      (taxHighPercentElement.topLeft![1] +
        taxHighPercentElement.bottomLeft![1]) /
      2;
    const midYValue1 =
      (taxHighValueElement1.topLeft![1] + taxHighValueElement1.bottomLeft![1]) /
      2;
    const midDiff1 = Math.abs(midYPercent - midYValue1);

    console.log(
      `Tax High Percent Element: ${JSON.stringify(taxHighPercentElement.text)}`
    );
    console.log(
      `Tax High Value Element 1: ${JSON.stringify(taxHighValueElement1.text)}`
    );
    console.log(`Top Y diff 1: ${topDiff1.toFixed(6)}`);
    console.log(`Mid Y diff 1: ${midDiff1.toFixed(6)}`);

    // Test with different methods and tolerances for value 1
    const methods = ["top", "midpoint", "bottom", "overlap", "combined"];
    const tolerances = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.05];

    methods.forEach((method) => {
      console.log(`\nMethod: ${method}`);
      tolerances.forEach((tolerance) => {
        const onSameLine = isOnSameLine(
          taxHighPercentElement,
          taxHighValueElement1,
          {
            method: method as SameLineOptions["method"],
            tolerance,
            permissiveTolerance: tolerance * 1.5,
          }
        );

        console.log(
          `Tolerance: ${tolerance.toFixed(3)}, onSameLine: ${onSameLine}`
        );
      });
    });

    // Also test with value 2 (1,91)
    console.log("\n=== TESTING HIGH TAX PERCENT AND VALUE 2 ===");
    const topDiff2 = Math.abs(
      taxHighPercentElement.topLeft![1] - taxHighValueElement2.topLeft![1]
    );
    const midYValue2 =
      (taxHighValueElement2.topLeft![1] + taxHighValueElement2.bottomLeft![1]) /
      2;
    const midDiff2 = Math.abs(midYPercent - midYValue2);

    console.log(
      `Tax High Percent Element: ${JSON.stringify(taxHighPercentElement.text)}`
    );
    console.log(
      `Tax High Value Element 2: ${JSON.stringify(taxHighValueElement2.text)}`
    );
    console.log(`Top Y diff 2: ${topDiff2.toFixed(6)}`);
    console.log(`Mid Y diff 2: ${midDiff2.toFixed(6)}`);

    methods.forEach((method) => {
      console.log(`\nMethod: ${method}`);
      tolerances.forEach((tolerance) => {
        const onSameLine = isOnSameLine(
          taxHighPercentElement,
          taxHighValueElement2,
          {
            method: method as SameLineOptions["method"],
            tolerance,
            permissiveTolerance: tolerance * 1.5,
          }
        );

        console.log(
          `Tolerance: ${tolerance.toFixed(3)}, onSameLine: ${onSameLine}`
        );
      });
    });
  });

  // Additional test for finding all elements on the same line
  it("should find all elements on the same line using different methods", () => {
    console.log("\n=== TESTING FINDING ALL ELEMENTS ON THE SAME LINE ===");

    // Create an array with all our test elements
    const allElements = [
      taxLowPercentElement,
      taxLowExclusiveElement,
      taxLowValueElement,
      taxHighPercentElement,
      taxHighValueElement1,
      taxHighValueElement2,
    ];

    // For each tax indicator, find which other elements are considered on the same line
    const methods = ["top", "midpoint", "bottom", "overlap", "combined"];
    const tolerances = [0.015, 0.025, 0.04];

    methods.forEach((method) => {
      tolerances.forEach((tolerance) => {
        console.log(`\nMethod: ${method}, Tolerance: ${tolerance.toFixed(3)}`);

        // For low tax (9,00%)
        const onSameLineWithLowTax = allElements.filter(
          (el) =>
            el !== taxLowPercentElement &&
            isOnSameLine(taxLowPercentElement, el, {
              method: method as SameLineOptions["method"],
              tolerance,
              permissiveTolerance: tolerance * 1.5,
            })
        );

        console.log(
          `Elements on same line as 9,00%: ${onSameLineWithLowTax.length}`
        );
        console.log(
          onSameLineWithLowTax.map((el) => `"${el.text}"`).join(" | ")
        );

        // For high tax (21,00%)
        const onSameLineWithHighTax = allElements.filter(
          (el) =>
            el !== taxHighPercentElement &&
            isOnSameLine(taxHighPercentElement, el, {
              method: method as SameLineOptions["method"],
              tolerance,
              permissiveTolerance: tolerance * 1.5,
            })
        );

        console.log(
          `Elements on same line as 21,00%: ${onSameLineWithHighTax.length}`
        );
        console.log(
          onSameLineWithHighTax.map((el) => `"${el.text}"`).join(" | ")
        );
      });
    });
  });
});
