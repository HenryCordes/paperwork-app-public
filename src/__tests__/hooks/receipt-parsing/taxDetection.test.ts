import { detectTaxValues } from "../../../hooks/receipt-parsing/taxDetection";
import { TextElement } from "../../../hooks/receipt-parsing/types";

describe("Tax Detection - Dutch receipts", () => {
  // Test for Dutch receipt with BTW LAAG (9%) and BTW HOOG (21%) values
  test("should detect BTW LAAG and BTW HOOG values from Dutch receipt format", () => {
    // Mock TextElement array to simulate a Dutch receipt with tax information
    const mockElements: TextElement[] = [
      {
        text: "SUBTOTAAL",
        topLeft: [10, 100],
        topRight: [100, 100],
        bottomLeft: [10, 120],
        bottomRight: [100, 120],
      },
      {
        text: "25.00",
        topLeft: [150, 100],
        topRight: [200, 100],
        bottomLeft: [150, 120],
        bottomRight: [200, 120],
      },
      {
        text: "EX BTW LAAG",
        topLeft: [10, 130],
        topRight: [100, 130],
        bottomLeft: [10, 150],
        bottomRight: [100, 150],
      },
      {
        text: "10.00",
        topLeft: [150, 130],
        topRight: [200, 130],
        bottomLeft: [150, 150],
        bottomRight: [200, 150],
      },
      {
        text: "BTW LAAG 9%",
        topLeft: [10, 160],
        topRight: [100, 160],
        bottomLeft: [10, 180],
        bottomRight: [100, 180],
      },
      {
        text: "0.90",
        topLeft: [150, 160],
        topRight: [200, 160],
        bottomLeft: [150, 180],
        bottomRight: [200, 180],
      },
      {
        text: "EX BTW HOOG",
        topLeft: [10, 190],
        topRight: [100, 190],
        bottomLeft: [10, 210],
        bottomRight: [100, 210],
      },
      {
        text: "15.00",
        topLeft: [150, 190],
        topRight: [200, 190],
        bottomLeft: [150, 210],
        bottomRight: [200, 210],
      },
      {
        text: "BTW HOOG 21%",
        topLeft: [10, 220],
        topRight: [100, 220],
        bottomLeft: [10, 240],
        bottomRight: [100, 240],
      },
      {
        text: "3.15",
        topLeft: [150, 220],
        topRight: [200, 220],
        bottomLeft: [150, 240],
        bottomRight: [200, 240],
      },
      {
        text: "TOTAAL",
        topLeft: [10, 250],
        topRight: [100, 250],
        bottomLeft: [10, 270],
        bottomRight: [100, 270],
      },
      {
        text: "29.05",
        topLeft: [150, 250],
        topRight: [200, 250],
        bottomLeft: [150, 270],
        bottomRight: [200, 270],
      },
    ];

    // Create cleaned text elements for testing
    const cleanedElements = mockElements.map((el) => el.text);

    // Extract numeric values for testing
    const numbers = cleanedElements
      .filter((text) => /^-?\d+([,.]\d+)?$/.test(text))
      .map((text) => parseFloat(text.replace(",", ".")));

    // Call the function to test
    const { lowTax, highTax } = detectTaxValues(
      cleanedElements,
      mockElements,
      numbers,
      29.05 // Total amount
    );

    // Expected values
    // Check if we detected the BTW LAAG value of 0.90
    expect(lowTax.length).toBeGreaterThan(0);
    if (lowTax.length > 0) {
      expect(lowTax[0].value).toBeCloseTo(0.9, 2);
      expect(lowTax[0].confidence).toBeGreaterThan(0.5);
    }

    // Check if we detected the BTW HOOG value of 3.15
    expect(highTax.length).toBeGreaterThan(0);
    if (highTax.length > 0) {
      expect(highTax[0].value).toBeCloseTo(3.15, 2);
      expect(highTax[0].confidence).toBeGreaterThan(0.5);
    }
  });
});
