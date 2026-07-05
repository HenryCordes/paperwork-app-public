import { TextElement } from "./types";
import { cleanText, isNumeric } from "./utils";
import {
  detectDecimalSeparator,
  isDutchNumberFormatProbability,
} from "../../utils/numberUtils";

export const preprocessText = (
  elements: TextElement[]
): {
  cleanedElements: string[];
  normalizedElements: TextElement[];
  numbers: number[];
  isEuropeanFormat: boolean;
  decimalSeparator: "," | ".";
} => {
  const cleanedElements: string[] = [];
  const normalizedElements: TextElement[] = [];
  const numbers: number[] = [];
  const areDebugging = import.meta.env.VITE_APP_DEBUG_MODE === "true";
  // First, determine the decimal separator format used across the entire receipt
  // by analyzing all text elements together
  const allText = elements.map((e) => e.text).join(" ");
  const decimalSeparator = detectDecimalSeparator(allText) || ",";
  const dutchProbability = isDutchNumberFormatProbability(allText);
  const isEuropeanFormat = decimalSeparator === "," || dutchProbability > 0.5;

  if (areDebugging) {
    console.log(
      `[Receipt Format Detection] Decimal separator: ${decimalSeparator}, Dutch probability: ${dutchProbability}, Using European format: ${isEuropeanFormat}`
    );
  }

  // Process each text element with the correct number format
  elements.forEach((element) => {
    if (!element.text) return;

    const cleanedText = cleanText(element.text);
    if (cleanedText === "") return;

    cleanedElements.push(cleanedText);

    // Clone the element with cleaned text
    normalizedElements.push({
      ...element,
      text: cleanedText,
    });

    // Extract numeric values using the correct decimal separator
    if (isNumeric(cleanedText)) {
      // Convert to JS number format (with period as decimal)
      const numValue = isEuropeanFormat
        ? parseFloat(cleanedText.replace(",", "."))
        : parseFloat(cleanedText);
      numbers.push(numValue);
    } else {
      // Check for embedded numbers like "€22.35" or "TOTAL: 42,50"
      const numericMatches = cleanedText.match(/\d+[,.]\d+/g);
      if (numericMatches) {
        numericMatches.forEach((match) => {
          // Convert to JS number format based on detected format
          const numValue = isEuropeanFormat
            ? parseFloat(match.replace(",", "."))
            : parseFloat(match.replace(/,/g, "")); // Remove thousands separators in US format
          numbers.push(numValue);
        });
      }
    }
  });

  return {
    cleanedElements,
    normalizedElements,
    numbers,
    isEuropeanFormat,
    decimalSeparator,
  };
};
