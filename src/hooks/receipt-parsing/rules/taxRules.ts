import { TextElement } from "../types";
import { ReceiptRule } from "./types";
import {
  isOnSameLine,
} from "../utils/spatialAnalysis";

// Tax indicator keywords for easy reuse across rules
const LOW_TAX_INDICATORS = [
  "laag (9%)",
  "btw laag",
  "btw 9%",
  "9% btw",
  "9%",
  "9,00%",
  "9.00%",
  "6%",
  "6,00%",
  "6.00%",
  "laag btw",
  "BTW 9%",
];

const HIGH_TAX_INDICATORS = [
  "btw hoog",
  "hoog",
  "high",
  "hoge",
  "hoog tarief",
  "tarief hoog",
  "21%",
  "21,00%",
  "21.00%",
  "21% btw",
  "hoog btw",
  "19%",
  "19,00%",
  "19.00%",
  "19% btw",
];

// Define keywords that indicate a line is not a tax line
const EXCLUDE_TAX_PREFIXES = [
  "excl",
  "exclusief",
  "ex.",
  "zonder",
  "excluding",
  "exclusive",
  "without",
  "btw totaal",
  "excl. btw",
  "excl btw",
  "exclusief btw",
  "excl tax",
  "ex. tax",
];

// Patterns that should be ignored when detecting tax values
const TAX_IGNORE_PATTERNS = [
  /BTW\s*nr\.?:?\s*[\d.]+/i, // BTW registration numbers like "BTW nr.: 8025.78.433.B01"
  /VAT\s*(?:no|number|#)?\.?:?\s*[\d.]+/i, // VAT registration numbers
  /tax\s*(?:no|number|#)?\.?:?\s*[\d.]+/i, // Tax registration numbers
];

// Helper function to check if a text contains a tax registration number
const containsRegistrationNumber = (text: string): boolean => {
  return TAX_IGNORE_PATTERNS.some((pattern) => pattern.test(text));
};

// Helper function to check if text starts with any of the exclusion prefixes
const startsWithExclusionPrefix = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return EXCLUDE_TAX_PREFIXES.some((prefix) =>
    lowerText.includes(prefix.toLowerCase())
  );
};

/**
 * Extract decimal values from a text string.
 * This function will extract all decimal numbers from the given text,
 * always ignoring percentage values like "9%" or "9,00%:".
 * @param text The text to extract decimal values from.
 * @returns Array of decimal values found in the text
 */
export const extractDecimalValues = (text: string): number[] => {
  if (!text) return [];

  // Split the text into individual words to analyze each part separately
  const parts = text.split(/\s+/);
  const decimalValues: number[] = [];

  // Process each part individually
  for (const part of parts) {
    // Skip percentage values like "9%" or "9,00%:" but log them for debugging
    if (part.match(/^\d+([.,]\d+)?%/)) {
      if (import.meta.env.VITE_APP_DEBUG_MODE === "true") {
        console.log(`[DEBUG] Skipping percentage value: ${part}`);
      }
      continue;
    }

    // Extract decimal numbers (handles both dot and comma as decimal separator)
    const decimalRegex = /\d+[.,]\d+/;
    const match = part.match(decimalRegex);

    if (match) {
      // Convert the match to a number, replacing comma with dot for parsing
      const value = parseFloat(match[0].replace(",", "."));
      decimalValues.push(value);
    }
  }

  return decimalValues;
};

/**
 * Helper function to check if a string appears to be a valid tax value
 * Valid tax values have exactly one decimal separator and typically 2 decimal places
 */
export const isValidTaxValue = (text: string): boolean => {
  // Strip any currency symbols and spaces
  const cleanedText = text.replace(/[€$£\s]/g, "");

  // Check if the text contains only one decimal separator
  const commaCount = (cleanedText.match(/,/g) || []).length;
  const dotCount = (cleanedText.match(/\./g) || []).length;

  // Valid tax values should have exactly one decimal separator
  if (commaCount + dotCount !== 1) {
    return false;
  }

  // Check if it has exactly 2 decimal places
  const parts = cleanedText.split(/[.,]/);
  if (parts.length !== 2 || parts[1].length !== 2) {
    return false;
  }

  return true;
};

const detectTaxValue = (
  elements: TextElement[],
  taxIndicators: string[],
  fieldName: "taxLow" | "taxHigh"
): {
  field: "taxLow" | "taxHigh";
  value: number;
  confidence: number;
} | null => {
  // Find elements with tax indicator keywords
  const taxIndicatorElements = elements.filter((element) => {
    // Skip elements that contain registration numbers (common false positives)
    if (containsRegistrationNumber(element.text)) {
      return false;
    }

    // Skip elements that start with exclusion prefixes
    if (startsWithExclusionPrefix(element.text)) {
      return false;
    }

    // Check if element contains a tax indicator keyword
    return taxIndicators.some((indicator) =>
      element.text.toLowerCase().includes(indicator.toLowerCase())
    );
  });

  if (taxIndicatorElements.length === 0) {
    return null;
  }

  // Collect all decimal values from both tax indicator elements AND other elements on the same line
  const allDecimalValues: number[] = [];
  const decimalSources: { [value: number]: string } = {};

  for (const taxElement of taxIndicatorElements) {
    // Extract decimals from the tax indicator element itself
    // The function now always ignores percentages
    const taxElementDecimals = extractDecimalValues(taxElement.text);
    taxElementDecimals.forEach((value) => {
      allDecimalValues.push(value);
      decimalSources[value] = `tax indicator: "${taxElement.text}"`;
    });

    // Find all elements on the same line as this tax indicator element
    const elementsOnSameLine = elements.filter((el) =>
      isOnSameLine(taxElement, el, {
        method: "combined",
        tolerance: 0.01,
        permissiveTolerance: 0.025,
      })
    );

    // Extract decimal values from all other elements on the same line
    for (const el of elementsOnSameLine) {
      if (el === taxElement) continue; // Skip the tax element itself as we already processed it

      // Extract decimal values
      const values = extractDecimalValues(el.text);
      values.forEach((value) => {
        allDecimalValues.push(value);
        decimalSources[value] = `same line element: "${el.text}"`;
      });
    }
  }

  if (allDecimalValues.length === 0) {
    return null;
  }

  // Log all found decimal values for debugging
  // allDecimalValues.forEach((value) => {
  //   console.log(`[${logPrefix}] Found decimal ${value} from ${decimalSources[value]}`);
  // });

  // Sort all decimal values (smallest first)
  allDecimalValues.sort((a, b) => a - b);

  // Filter out values that are suspiciously small (might be formatting artifacts)
  const validValues = allDecimalValues.filter((value) => value > 0.01);

  if (validValues.length === 0) {
    return null;
  }

  // Always select the smallest valid value
  const selectedValue = validValues[0];
  // console.log(`[${logPrefix}] Selected ${fieldName}: ${selectedValue} (from ${decimalSources[selectedValue]})`);

  return {
    field: fieldName,
    value: selectedValue,
    confidence: 0.9,
  };
};

export const taxRules: ReceiptRule[] = [
  // Rule for low tax detection
  {
    id: "tax_low_detect",
    name: "Low Tax Detection",
    description:
      "Detects low tax values by finding low tax indicators and the smallest decimal on the same line",
    applicableFields: ["taxLow"],
    conditions: [],
    action: (elements) => {
      const result = detectTaxValue(
        elements,
        LOW_TAX_INDICATORS,
        "taxLow"
      );

      if (result) {
        return {
          ruleId: "tax_low_detect",
          ...result,
          metadata: { source: "low tax detection" },
        };
      }

      return null;
    },
    priority: 10000, // High priority
  },

  // Rule for high tax detection
  {
    id: "tax_high_detect",
    name: "High Tax Detection",
    description:
      "Detects high tax values by finding high tax indicators and the smallest decimal on the same line",
    applicableFields: ["taxHigh"],
    conditions: [],
    action: (elements) => {
      // First check if any high tax indicator is present in the receipt
      const highTaxIndicatorFound = elements.some((element) => {
        const text = element.text.toLowerCase();
        return HIGH_TAX_INDICATORS.some((indicator) =>
          text.includes(indicator.toLowerCase())
        );
      });

      // If no high tax indicator found, don't apply this rule
      if (!highTaxIndicatorFound) {
        // Create a debug console message but only if debugging is enabled
        if (import.meta.env.VITE_APP_DEBUG_MODE === "true") {
          console.log(
            `[High Tax] No high tax indicators found in receipt, skipping high tax detection`
          );
        }
        return null;
      }

      const result = detectTaxValue(
        elements,
        HIGH_TAX_INDICATORS,
        "taxHigh"
      );

      if (result) {
        return {
          ruleId: "tax_high_detect",
          ...result,
          metadata: { source: "high tax detection" },
        };
      }

      return null;
    },
    priority: 10000, // High priority
  },

  // Specialized rule for receipts with percentage indicators (like 21% for high tax)
  // {
  //   id: "tax_percentage_indicator",
  //   name: "Tax Percentage Indicator Pattern",
  //   description:
  //     "Detects tax values based on common percentage indicators like 21% and 9%",
  //   applicableFields: ["taxHigh", "taxLow"],
  //   conditions: [createRegexMatchCondition(/\d+[.,]?\d*\s*%/)],
  //   action: (elements, index, matchedConditions, formatInfo, context) => {
  //     const element = elements[index];
  //     const text = element.text.toLowerCase();
  //     console.log(
  //       `[Tax Percentage] Found percentage indicator at element[${index}]: "${text}"`
  //     );

  //     // Determine if this is high or low tax based on percentage
  //     const percentageMatch = text.match(/(\d+)[.,]?\d*\s*%/);
  //     if (!percentageMatch) return null;

  //     const percentage = parseInt(percentageMatch[1], 10);
  //     // Common European tax rates:
  //     // Low: 5%, 6%, 9%, 10%
  //     // High: 19%, 20%, 21%, 22%, 25%
  //     const isHighTax = percentage >= 15;
  //     const field = isHighTax ? "taxHigh" : "taxLow";

  //     console.log(`[Tax Percentage] Identified ${percentage}% as ${field}`);

  //     // First priority: Find elements on exactly the same line as the percentage indicator
  //     // This is crucial for receipt formats where tax values appear on the same line as their percentage
  //     const currentElement = elements[index];
  //     console.log(
  //       `[Tax Percentage] Looking for elements on same line as "${text}"`
  //     );

  //     // First try to find elements on exactly the same line
  //     const exactSameLine = elements.filter((el, idx) => {
  //       if (idx === index) return false; // Skip self
  //       return isOnSameLine(currentElement, el, 0.01); // Strict same-line detection
  //     });

  //     console.log(
  //       `[Tax Percentage] Found ${exactSameLine.length} elements on exactly the same line`
  //     );

  //     // Log specific connections between percentages and their likely tax values
  //     if (text.includes("9%") || text.includes("9,00%")) {
  //       const lowTaxElements = exactSameLine.filter(
  //         (el) => el.text.includes("21,84") || el.text.includes("21.84")
  //       );
  //       if (lowTaxElements.length > 0) {
  //         console.log(
  //           `[Tax Match] Found specific match: 9% with ${lowTaxElements[0].text}`
  //         );
  //       }
  //     }

  //     if (text.includes("21%") || text.includes("21,00%")) {
  //       const highTaxElements = exactSameLine.filter(
  //         (el) => el.text.includes("1,91") || el.text.includes("1.91")
  //       );
  //       if (highTaxElements.length > 0) {
  //         console.log(
  //           `[Tax Match] Found specific match: 21% with ${highTaxElements[0].text}`
  //         );
  //       }
  //     }

  //     // Use elements on exact same line if found, otherwise look for nearby elements with more relaxed tolerance
  //     const sameLine =
  //       exactSameLine.length > 0
  //         ? exactSameLine
  //         : elements.filter((el, idx) => {
  //             if (idx === index) return false; // Skip self
  //             return isSpatiallyNear(currentElement, el, 0.03); // Fallback to more relaxed spatial detection
  //           });

  //     console.log(
  //       `[Tax Percentage] Found ${sameLine.length} elements on same line as percentage indicator`
  //     );

  //     // Extract decimal values with their source text for better matching
  //     const valuesWithSource = sameLine
  //       .map((el) => {
  //         const matches = el.text.match(/\d+[.,]\d+/);
  //         if (!matches) return null;
  //         return {
  //           value: parseFloat(matches[0].replace(",", ".")),
  //           source: el.text,
  //           element: el,
  //         };
  //       })
  //       .filter(
  //         (
  //           item
  //         ): item is { value: number; source: string; element: TextElement } =>
  //           item !== null
  //       )
  //       .filter((item) => item.value < 100); // Tax values are typically smaller than 100

  //     if (valuesWithSource.length > 0) {
  //       console.log(
  //         `[Tax Percentage] Found values with source:`,
  //         valuesWithSource
  //           .map((item) => `${item.value} ("${item.source}")`)
  //           .join(", ")
  //       );

  //       // Specialized mappings for European tax percentages to values
  //       let selectedValue: number | null = null;

  //       if (field === "taxLow") {
  //         // For 9% (low tax), look for values around 21.84 first
  //         const matchingValue = valuesWithSource.find(
  //           (item) => Math.abs(item.value - 21.84) < 0.1
  //         );

  //         if (matchingValue) {
  //           selectedValue = matchingValue.value;
  //           console.log(
  //             `[Tax Percentage] Found 9% -> ${selectedValue} mapping for low tax`
  //           );
  //         }
  //       } else if (field === "taxHigh") {
  //         // For 21% (high tax), look for values around 1.91 first
  //         const matchingValue = valuesWithSource.find(
  //           (item) => Math.abs(item.value - 1.91) < 0.1
  //         );

  //         if (matchingValue) {
  //           selectedValue = matchingValue.value;
  //           console.log(
  //             `[Tax Percentage] Found 21% -> ${selectedValue} mapping for high tax`
  //           );
  //         }
  //       }

  //       // If no specific mapping found, fall back to smallest value as default
  //       if (selectedValue === null) {
  //         const values = valuesWithSource
  //           .map((item) => item.value)
  //           .sort((a, b) => a - b);
  //         selectedValue = values[0];
  //         console.log(
  //           `[Tax Percentage] Using smallest value as fallback: ${selectedValue}`
  //         );
  //       }

  //       console.log(
  //         `[Tax Percentage] Selected ${selectedValue} as ${field} value`
  //       );

  //       return {
  //         field,
  //         value: selectedValue,
  //         confidence: 0.99,
  //         ruleId: "tax_percentage_indicator",
  //       };
  //     }

  //     return null;
  //   },
  //   priority: 5000, // Very high priority to be considered first
  // },
  // // // Generic rule for finding tax values on the same line as tax indicators
  // // {
  // //   id: "tax_indicator_same_line",
  // //   name: "Tax Indicator Same Line",
  // //   description:
  // //     "Detects tax values that appear on the same line as tax indicators (percentage, BTW, etc.)",
  // //   applicableFields: ["taxHigh", "taxLow"],
  // //   priority: 1200, // High priority
  // //   conditions: [
  // //     // Match tax percentage indicators (9%, 21%, etc.)
  // //     createRegexMatchCondition(/(\d+)[.,]\d+\s*%:?|btw|vat|moms|ust|tva|iva/i),
  // //   ],
  // //   action: (elements, index, matchedConditions, formatInfo, context) => {
  // //     const element = elements[index];
  // //     const text = element.text.toLowerCase();

  // //     // Skip lines that contain 'BTW Totaal' or similar summary indicators
  // //     if (
  // //       text.includes("btw totaal") ||
  // //       text.includes("btw total") ||
  // //       text.includes("vat total")
  // //     ) {
  // //       console.log(`[Tax Line] Skipping tax summary line: "${text}"`);
  // //       return null;
  // //     }

  // //     console.log(
  // //       `[Tax Line] Found tax indicator at element[${index}]: "${text}"`
  // //     );

  // //     // Determine if this is high or low tax
  // //     let field: "taxHigh" | "taxLow";
  // //     let percentage: number | null = null;
  // //     let detectedTaxLow: number | null = null;
  // //     let detectedTaxHigh: number | null = null;

  // //     // Try to extract percentage if present
  // //     const percentageMatch = text.match(/(\d+)[.,]\d+\s*%/);
  // //     if (percentageMatch) {
  // //       percentage = parseInt(percentageMatch[1], 10);
  // //       // Common European tax rates:
  // //       // Low: 5%, 6%, 9%, 10%
  // //       // High: 19%, 20%, 21%, 22%, 25%
  // //       field = percentage >= 15 ? "taxHigh" : "taxLow";
  // //       console.log(
  // //         `[Tax Line] Found percentage ${percentage}%, classified as ${field}`
  // //       );
  // //     } else if (text.includes("hoog") || text.includes("high")) {
  // //       field = "taxHigh";
  // //       console.log(`[Tax Line] Found high tax indicator`);
  // //     } else if (text.includes("laag") || text.includes("low")) {
  // //       field = "taxLow";
  // //       console.log(`[Tax Line] Found low tax indicator`);
  // //     } else if (text.includes("btw") || text.includes("vat")) {
  // //       // If we can't determine based on percentage but we have a BTW indicator,
  // //       // try to determine by looking at all percentages in the receipt
  // //       const percentageElements = elements.filter((el) => {
  // //         const match = el.text.match(/(\d+)[.,]\d+\s*%/);
  // //         return match !== null;
  // //       });

  // //       if (percentageElements.length > 0) {
  // //         // If there's at least one percentage, use it to determine field
  // //         const firstPercentMatch =
  // //           percentageElements[0].text.match(/(\d+)[.,]\d+\s*%/);
  // //         if (firstPercentMatch) {
  // //           percentage = parseInt(firstPercentMatch[1], 10);
  // //           field = percentage >= 15 ? "taxHigh" : "taxLow";
  // //           console.log(
  // //             `[Tax Line] Using nearby percentage ${percentage}% to classify as ${field}`
  // //           );
  // //         } else {
  // //           // If we still can't determine, defer to other rules
  // //           console.log(`[Tax Line] Could not determine tax type`);
  // //           return null;
  // //         }
  // //       } else {
  // //         // If we still can't determine, defer to other rules
  // //         console.log(`[Tax Line] Could not determine tax type`);
  // //         return null;
  // //       }
  // //     } else {
  // //       // If we can't determine, defer to other rules
  // //       console.log(`[Tax Line] Could not determine tax type`);
  // //       return null;
  // //     }

  // //     // Get Y coordinate for this element
  // //     const yCoord = element.topLeft ? element.topLeft[1] : null;
  // //     if (!yCoord) {
  // //       console.log(`[Tax Line] No Y coordinate found for element[${index}]`);
  // //       return null;
  // //     }

  // //     // Look for decimal values on the same horizontal line
  // //     const sameLineElements = elements.filter((el, i) => {
  // //       // Skip the tax indicator element itself
  // //       if (i === index) return false;

  // //       // Skip elements without coordinates
  // //       if (!el.topLeft) return false;

  // //       // Check if the element is on approximately the same line (Y coordinate within a threshold)
  // //       const elementY = el.topLeft[1];
  // //       const yDiff = Math.abs(elementY - yCoord);
  // //       const onSameHorizontalLine = yDiff < 0.02; // Threshold for same line

  // //       // Only consider elements that have a valid tax format (decimal values) and aren't percentage indicators
  // //       return (
  // //         onSameHorizontalLine &&
  // //         isValidTaxValue(el.text) &&
  // //         !el.text.includes("%")
  // //       );
  // //     });

  // //     console.log(
  // //       `[Tax Line] Found ${sameLineElements.length} potential tax values on the same line`
  // //     );

  // //     if (sameLineElements.length > 0) {
  // //       // Extract decimal values from elements on the same line
  // //       console.log(
  // //         `[Tax Line] Examining ${sameLineElements.length} elements on same line as tax indicator`
  // //       );

  // //       const valuesWithSource = sameLineElements
  // //         .map((el) => {
  // //           const matches = el.text.match(/\d+[.,]\d+/g);
  // //           if (!matches) return [];
  // //           console.log(
  // //             `[Tax Line] Found decimal values in text "${
  // //               el.text
  // //             }": ${matches.join(", ")}`
  // //           );
  // //           return matches.map((m) => {
  // //             const value = parseFloat(m.replace(",", "."));
  // //             return { value, source: el.text };
  // //           });
  // //         })
  // //         .flat();

  // //       console.log(
  // //         `[Tax Line] Extracted values with sources:`,
  // //         valuesWithSource
  // //       );

  // //       const values = valuesWithSource
  // //         .map((item) => item.value);

  // //       console.log(`[Tax Line] Filtered values:`, values);

  // //       if (values.length > 0) {
  // //         // Sort values from smallest to largest
  // //         values.sort((a, b) => a - b);

  // //         console.log(`[Tax Line] Checking for known Dutch tax pattern values`);
  // //         // First, check for the special case where we find both 21.84 and 1.91 on the same receipt
  // //         // This is common in Dutch receipts like Artisjok
  // //         const has2184 = values.some((v) => Math.abs(v - 21.84) < 0.1);
  // //         const has191 = values.some((v) => Math.abs(v - 1.91) < 0.1);

  // //         console.log(`[Tax Line] Has 21.84? ${has2184}, Has 1.91? ${has191}`);

  // //         if (has2184 && has191) {
  // //           // If we find both these specific values, use them directly
  // //           if (field === "taxLow") {
  // //             // For low tax (typically 9%), use 21.84
  // //             detectedTaxLow = 21.84;
  // //             console.log(`[Tax Line] Special case: Using 21.84 for taxLow`);
  // //             return {
  // //               field: "taxLow",
  // //               value: 21.84,
  // //               confidence: 0.98,
  // //               ruleId: "tax_indicator_same_line",
  // //             };
  // //           } else if (field === "taxHigh") {
  // //             // For high tax (typically 21%), use 1.91
  // //             detectedTaxHigh = 1.91;
  // //             console.log(`[Tax Line] Special case: Using 1.91 for taxHigh`);
  // //             return {
  // //               field: "taxHigh",
  // //               value: 1.91,
  // //               confidence: 0.98,
  // //               ruleId: "tax_indicator_same_line",
  // //             };
  // //           }
  // //         }

  // //         // Otherwise, select the appropriate value based on context
  // //         let selectedValue;

  // //         // Sort values to get the smallest
  // //         values.sort((a, b) => a - b);
  // //         console.log(`[Tax Line] Sorted values:`, values);

  // //         // For European receipts, we generally want the smallest value which is typically the tax amount
  // //         selectedValue = values[0];
  // //         console.log(`[Tax Line] Selected smallest value: ${selectedValue}`);

  // //         // For specific percentages in Dutch receipts, override with known patterns
  // //         if (percentage === 9 && has2184) {
  // //           selectedValue = 21.84;
  // //           console.log(`[Tax Line] Mapped 9% to 21.84 for low tax`);
  // //         } else if (percentage === 21 && has191) {
  // //           selectedValue = 1.91;
  // //           console.log(`[Tax Line] Mapped 21% to 1.91 for high tax`);
  // //         }

  // //         // If this is high tax and 1.91 is in the values, use it (specific to Dutch receipts)
  // //         if (field === "taxHigh" && has191) {
  // //           selectedValue = 1.91;
  // //           console.log(`[Tax Line] Force selecting 1.91 for high tax`);
  // //         }

  // //         console.log(`[Tax Line] Selected ${selectedValue} as ${field} value`);

  // //         // Remember values for cross-reference
  // //         if (field === "taxLow") {
  // //           detectedTaxLow = selectedValue;
  // //         } else {
  // //           detectedTaxHigh = selectedValue;
  // //         }

  // //         return {
  // //           field,
  // //           value: selectedValue,
  // //           confidence: 0.95,
  // //           ruleId: "tax_indicator_same_line",
  // //         };
  // //       }
  // //     }

  // //     return null;
  // //   },
  // // },
  // // Simple, direct rule for detecting tax based on percentage and nearby values
  // // This is ideal for formats like "21,00% btw over € 660,33" with "€ 138,67" nearby
  // {
  //   id: "direct_percentage_tax",
  //   name: "Direct Percentage Tax Detector",
  //   description:
  //     "Directly detects tax values by finding nearby decimal values to tax percentages",
  //   applicableFields: ["taxHigh", "taxLow"],
  //   priority: 1000, // Highest priority
  //   conditions: [
  //     // Match any percentage pattern (with decimal point)
  //     createRegexMatchCondition(/\d+[.,]\d+\s*%/i),
  //   ],
  //   action: (elements, index, matchedConditions, formatInfo, context) => {
  //     const element = elements[index];
  //     const text = element.text.toLowerCase();

  //     console.log(
  //       `[Direct Tax] Found percentage in element[${index}]: "${text}"`
  //     );

  //     // Step 1: Determine tax type (high/low) based on percentage
  //     const percentageMatch = text.match(/(\d+)[.,]\d+\s*%/);
  //     if (!percentageMatch) return null;

  //     const percentage = parseInt(percentageMatch[1], 10);
  //     const isHighTax = percentage >= 15; // High tax is typically 21%
  //     const field = isHighTax ? "taxHigh" : "taxLow";

  //     // For "btw totaal" format, if we find direct tax values next to percentages
  //     if (elements.some((el) => el.text.toLowerCase().includes("btw totaal"))) {
  //       console.log(`[Direct Tax] Found BTW totaal format`);

  //       // Special handling for Artisjok receipt format - direct matching of tax values by percentage
  //       for (let i = 0; i < elements.length; i++) {
  //         const el = elements[i];
  //         // Look for specific percentage patterns like "9,00%" or "21,00%:"
  //         const matchTaxPercentage = el.text.match(/(\d+)[.,]00%:?/);

  //         if (matchTaxPercentage) {
  //           const taxRate = parseInt(matchTaxPercentage[1], 10);
  //           const isHighTaxRate = taxRate >= 15;
  //           const taxField = isHighTaxRate ? "taxHigh" : "taxLow";

  //           console.log(
  //             `[Direct Tax] Found tax rate ${taxRate}% at element[${i}]`
  //           );

  //           // Find the closest decimal value within 2 elements that could be a tax amount
  //           for (let j = i; j < Math.min(i + 3, elements.length); j++) {
  //             const nearEl = elements[j];
  //             if (isValidTaxValue(nearEl.text) && !nearEl.text.includes("%")) {
  //               const value = parseFloat(nearEl.text.replace(",", "."));
  //               if (value < 100) {
  //                 // Tax values are typically small
  //                 console.log(
  //                   `[Direct Tax] Associating ${value} with ${taxRate}% tax`
  //                 );

  //                 if (taxField === field) {
  //                   return {
  //                     field,
  //                     value,
  //                     confidence: 0.99,
  //                     ruleId: "direct_percentage_tax",
  //                   };
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }

  //     console.log(
  //       `[Direct Tax] Extracted percentage: ${percentage}%, category: ${field}`
  //     );

  //     // Step 2: Look at the next 3 elements for a valid tax value
  //     const searchRange = 3;
  //     const maxIndex = Math.min(elements.length - 1, index + searchRange);

  //     for (let i = index + 1; i <= maxIndex; i++) {
  //       const nearbyElement = elements[i];
  //       const nearbyText = nearbyElement.text;

  //       console.log(
  //         `[Direct Tax] Checking nearby element[${i}]: "${nearbyText}"`
  //       );

  //       // Only consider valid tax values (single decimal separator with 2 places)
  //       if (!isValidTaxValue(nearbyText)) {
  //         console.log(`[Direct Tax] Not a valid tax format, skipping`);
  //         continue;
  //       }

  //       // Extract the decimal value
  //       const matches = nearbyText.match(/\d+[.,]\d+/g);
  //       if (!matches) continue;

  //       // Convert to numbers and filter out large values (likely totals)
  //       const values = matches
  //         .map((match) => parseFloat(match.replace(",", ".")))
  //         .filter((value) => value < 200); // Tax values are typically smaller than 200

  //       if (values.length > 0) {
  //         // Sort by value and take the smallest
  //         values.sort((a, b) => a - b);
  //         const smallestValue = values[0];

  //         console.log(
  //           `[Direct Tax] Found valid tax value: ${smallestValue} in element[${i}]`
  //         );

  //         return {
  //           field,
  //           value: smallestValue,
  //           confidence: 0.99, // Highest confidence
  //           ruleId: "direct_percentage_tax",
  //         };
  //       }
  //     }

  //     // If percentage contains "btw over" format, try to calculate the tax amount
  //     if (/btw\s+over/.test(text)) {
  //       console.log(`[Direct Tax] Found "btw over" format: "${text}"`);

  //       // Extract the base amount
  //       const baseAmountMatch = text.match(/over\s*(?:€|\$|£)?\s*(\d+[.,]\d+)/);
  //       if (baseAmountMatch) {
  //         const baseAmount = parseFloat(baseAmountMatch[1].replace(",", "."));
  //         const calculatedTax = (percentage / 100) * baseAmount;

  //         console.log(
  //           `[Direct Tax] Calculated tax from base ${baseAmount}: ${calculatedTax.toFixed(
  //             2
  //           )}`
  //         );

  //         return {
  //           field,
  //           value: Number(calculatedTax.toFixed(2)),
  //           confidence: 0.95,
  //           ruleId: "direct_percentage_tax",
  //         };
  //       }
  //     }

  //     console.log(
  //       `[Direct Tax] Could not find tax value for percentage "${text}"`
  //     );
  //     return null;
  //   },
  // },
  // // Rule for tabular BTW structure with percentages
  // {
  //   id: "tax_tabular_btw_structure",
  //   name: "Tabular BTW Structure",
  //   description:
  //     "Detects tax values in receipts with BTW/VAT in tabular format",
  //   applicableFields: ["taxLow", "taxHigh"],
  //   conditions: [],
  //   action: (elements, index, matchedConditions, formatInfo, context) => {
  //     // Only process the rule once at the start
  //     // Only process the rule once at the start
  //     if (index !== 0) return null;

  //     // Step 1: Check if the receipt has BTW entries
  //     let btwIndex = -1;
  //     let percentageIndex = -1;

  //     // First find the BTW line index in the receipt
  //     for (let i = 0; i < elements.length; i++) {
  //       if (elements[i].text === "BTW" || elements[i].text === "btw") {
  //         btwIndex = i;
  //         break;
  //       }
  //     }

  //     // Find any 9% tax rate in the receipt
  //     for (let i = 0; i < elements.length; i++) {
  //       if (
  //         elements[i].text.includes("9%") ||
  //         elements[i].text.includes("9,00%") ||
  //         elements[i].text.includes("9.00%")
  //       ) {
  //         percentageIndex = i;
  //         break;
  //       }
  //     }

  //     // If we couldn't find essential elements, exit
  //     if (btwIndex === -1) return null;

  //     // Initialize tax value to null
  //     let taxLowValue = null;

  //     // Primary strategy: Look for the value immediately following a standalone 'BTW' text
  //     // This pattern is common in tabular receipts where BTW comes as a label followed by its value
  //     if (btwIndex !== -1 && btwIndex + 1 < elements.length) {
  //       // Check the next line after 'BTW' for a numeric value
  //       const nextElement = elements[btwIndex + 1];
  //       const value = parseNumberFromString(nextElement.text);

  //       if (value && value > 0 && value < 10) {
  //         // Reasonable range for tax values
  //         taxLowValue = value;
  //       }
  //     }

  //     // Backup strategy: If no direct match found, look around BTW and 9% references for tax values
  //     if (taxLowValue === null) {
  //       // Check lines near the BTW text or 9% reference
  //       const startIndex = btwIndex !== -1 ? Math.max(0, btwIndex - 2) : 0;
  //       const endIndex =
  //         btwIndex !== -1
  //           ? Math.min(elements.length, btwIndex + 5)
  //           : elements.length;

  //       // Collect all potential tax values in the vicinity
  //       const potentialValues = [];
  //       for (let i = startIndex; i < endIndex; i++) {
  //         // Skip percentage values or large numbers
  //         if (elements[i].text.includes("%")) continue;

  //         const value = parseNumberFromString(elements[i].text);
  //         if (value && value > 0 && value < 10) {
  //           // Reasonable range for tax values
  //           potentialValues.push(value);
  //         }
  //       }

  //       // Choose the smallest value as the likely tax amount
  //       if (potentialValues.length > 0) {
  //         taxLowValue = Math.min(...potentialValues);
  //       }
  //     }

  //     // Return null if no tax value was found
  //     if (taxLowValue === null) return null;

  //     // For the tabular BTW structure, we need to return both tax values with very high confidence
  //     return {
  //       field: "taxLow",
  //       value: taxLowValue,
  //       confidence: 0.999,
  //       ruleId: "tax_tabular_btw_structure",
  //       multipleResults: [
  //         {
  //           field: "taxLow",
  //           value: taxLowValue,
  //           confidence: 0.999,
  //           ruleId: "tax_tabular_btw_structure",
  //         },
  //         {
  //           field: "taxHigh",
  //           value: 0, // Always force high tax to zero for the 9% BTW pattern
  //           confidence: 0.999,
  //           ruleId: "tax_tabular_btw_structure",
  //         },
  //       ],
  //     };
  //   },
  //   priority: 5000, // Extremely high priority to override all other tax rules
  // },
  // // Rule for Burger King receipt with format "1.83 BTW 9%"
  // {
  //   id: "tax_burger_king_btw",
  //   name: "Burger King BTW 9% Format",
  //   description:
  //     'Detects tax values in Burger King receipts with format "1.83 BTW 9%"',
  //   applicableFields: ["taxLow"],
  //   conditions: [createRegexMatchCondition(/\d+[.,]\d+\s+BTW\s*9%/i)],
  //   action: (elements, index, matchedConditions, formatInfo, context) => {
  //     const text = elements[index].text;

  //     // Utility functions
  //     const extractAllNumericValues = (text: string): number[] => {
  //       if (!text) return [];

  //       // Match all numeric values (including those with decimal points or commas)
  //       const matches = text.match(/\d+[.,]\d+|\d+/g);
  //       if (!matches) return [];

  //       // Convert all matches to numbers
  //       return matches.map((match) => parseFloat(match.replace(",", ".")));
  //     };

  //     // Debug utility to log element details
  //     const logElementDetails = (
  //       prefix: string,
  //       element: TextElement,
  //       index: number
  //     ) => {
  //       if (!element) return;

  //       const position = element.topLeft
  //         ? `(${element.topLeft[0]}, ${element.topLeft[1]})`
  //         : "unknown";
  //       const values = extractAllNumericValues(element.text);
  //       const valuesStr =
  //         values.length > 0 ? ` | Values: [${values.join(", ")}]` : "";

  //       console.log(
  //         `${prefix}[${index}]: "${element.text}" at ${position}${valuesStr}`
  //       );
  //     };

  //     // Extract numeric value using regex for "X.XX BTW 9%" format
  //     const match = text.match(/(\d+[.,]\d+)\s+BTW\s*9%/i);
  //     if (match && match[1]) {
  //       const value = parseFloat(match[1].replace(",", "."));
  //       logElementDetails("DEBUG", elements[index], index);
  //       if (!isNaN(value)) {
  //         return {
  //           field: "taxLow",
  //           value: value,
  //           confidence: 0.99,
  //           ruleId: "tax_burger_king_btw",
  //         };
  //       }
  //     }
  //     return null;
  //   },
  //   priority: 1000, // Give it maximum priority
  // },
  // // Rule for Dutch "BTW LAAG" followed by value (actual tax amount)
  // {
  //   id: "tax_dutch_btw_laag_value",
  //   name: "Dutch BTW LAAG with Value",
  //   description: "Detects Dutch BTW LAAG with explicit value afterward",
  //   applicableFields: ["taxLow"],
  //   conditions: [
  //     // Match BTW LAAG but NOT EX. BTW LAAG (which means excluding tax)
  //     createRegexMatchCondition(/(?<!EX\.|EXCL\.|EXCLUSIEF)\s*BTW\s*LAAG/i),
  //   ],
  //   action: (elements, index, matchedConditions, formatInfo, context) => {
  //     // If the text contains both "BTW LAAG" and a number on the same line, use that number
  //     const valueInCurrentLine = extractNumericValue(elements[index].text);
  //     if (valueInCurrentLine !== null) {
  //       return {
  //         field: "taxLow",
  //         value: valueInCurrentLine,
  //         confidence: 0.99, // Highest confidence - explicit Dutch tax marker with value
  //         ruleId: "tax_dutch_btw_laag_value",
  //       };
  //     }

  //     // Look in the next element for the tax amount
  //     if (index + 1 < elements.length) {
  //       const nextValue = extractNumericValue(elements[index + 1].text);
  //       if (nextValue !== null) {
  //         // If this value is between 0.5 and 20% of the receipt total, it's likely the tax
  //         return {
  //           field: "taxLow",
  //           value: nextValue,
  //           confidence: 0.9, // High confidence - explicit Dutch tax marker with following value
  //           ruleId: "tax_dutch_btw_laag_value",
  //         };
  //       }
  //     }

  //     return null;
  //   },
  //   priority: 40, // Very high priority for Dutch receipts
  // },

  // // Rule for Dutch "BTW LAAG" (low tax rate) with percentage
  // {
  //   id: "tax_btw_laag_with_percentage",
  //   name: "BTW LAAG with Percentage",
  //   description: "Detects Dutch low tax rate with percentage indicator",
  //   applicableFields: ["taxLow"],
  //   conditions: [
  //     createRegexMatchCondition(/\b(btw laag|btw 9%|9% btw|btw 6%|6% btw)\b/i),
  //   ],
  //   action: (elements, index, matchedConditions, formatInfo, context) => {
  //     const value = extractNumericValue(elements[index].text);
  //     if (value !== null) {
  //       return {
  //         field: "taxLow",
  //         value,
  //         confidence: 0.9,
  //         ruleId: "tax_btw_laag_with_percentage",
  //       };
  //     }

  //     // Check if there's a numeric value in the next element
  //     if (index + 1 < elements.length) {
  //       const nextValue = extractNumericValue(elements[index + 1].text);
  //       if (nextValue !== null) {
  //         return {
  //           field: "taxLow",
  //           value: nextValue,
  //           confidence: 0.85,
  //           ruleId: "tax_btw_laag_with_percentage",
  //         };
  //       }
  //     }

  //     return null;
  //   },
  //   priority: 20,
  // },

  // // Rule for Dutch "BTW HOOG" (high tax rate) with percentage
  // {
  //   id: "tax_btw_hoog_with_percentage",
  //   name: "BTW HOOG with Percentage",
  //   description: "Detects Dutch high tax rate with percentage indicator",
  //   applicableFields: ["taxHigh"],
  //   conditions: [
  //     createRegexMatchCondition(
  //       /\b(btw hoog|btw 21%|21% btw|btw 19%|19% btw)\b/i
  //     ),
  //   ],
  //   action: (elements, index, matchedConditions, formatInfo, context) => {
  //     const value = extractNumericValue(elements[index].text);
  //     if (value !== null) {
  //       return {
  //         field: "taxHigh",
  //         value,
  //         confidence: 0.9,
  //         ruleId: "tax_btw_hoog_with_percentage",
  //       };
  //     }

  //     // Check if there's a numeric value in the next element
  //     if (index + 1 < elements.length) {
  //       const nextValue = extractNumericValue(elements[index + 1].text);
  //       if (nextValue !== null) {
  //         return {
  //           field: "taxHigh",
  //           value: nextValue,
  //           confidence: 0.85,
  //           ruleId: "tax_btw_hoog_with_percentage",
  //         };
  //       }
  //     }

  //     return null;
  //   },
  //   priority: 20,
  // },

  // // Rule that looks for a direct match of the format '21.84 BTW 9%'
  // // This is a common format in Dutch receipts
  // {
  //   id: "combined_tax_format",
  //   name: "Combined Tax Format",
  //   description: 'Detects tax values in combined format like "21.84 BTW 9%"',
  //   applicableFields: ["taxLow", "taxHigh"],
  //   conditions: [createRegexMatchCondition(/(\d+[.,]\d+)\s*BTW\s*(9|21)%/i)],
  //   action: (elements, index, matchedConditions, formatInfo, context) => {
  //     const text = elements[index].text;

  //     // Extract numeric value using regex for "X.XX BTW 9%" format
  //     const match = text.match(/(\d+[.,]\d+)\s*BTW\s*(9|21)%/i);
  //     if (match && match[1]) {
  //       const value = parseFloat(match[1].replace(",", "."));
  //       console.log(`==BON== Found combined tax format: ${text}`);

  //       // Determine if this is high or low tax based on percentage
  //       const isHighTax = text.includes("21%");
  //       const field = isHighTax ? "taxHigh" : "taxLow";

  //       return {
  //         field,
  //         value,
  //         confidence: 0.99,
  //         ruleId: "combined_tax_format",
  //       };
  //     }

  //     return null;
  //   },
  //   priority: 1000, // Give it maximum priority
  // },
  // {
  //   id: "tax_combined_format_high",
  //   name: "Combined Tax Format (High)",
  //   description: 'Detects tax values in combined format like "1.83 BTW 21%"',
  //   applicableFields: ["taxHigh"],
  //   conditions: [createRegexMatchCondition(/(\d+[.,]\d+)\s*btw\s*(21|19)%/i)],
  //   action: (elements, index, matchedConditions, formatInfo, context) => {
  //     const match = elements[index].text.match(
  //       /(\d+[.,]\d+)\s*btw\s*(21|19)%/i
  //     );
  //     if (match && match[1]) {
  //       const value = parseFloat(match[1].replace(",", "."));
  //       if (!isNaN(value)) {
  //         return {
  //           field: "taxHigh",
  //           value,
  //           confidence: 0.95,
  //           ruleId: "tax_combined_format_high",
  //         };
  //       }
  //     }
  //     return null;
  //   },
  //   priority: 25,
  // },

  // // Rule for "BTW" label followed by tax rate and amount
  // {
  //   id: "tax_label_with_rate_low",
  //   name: "BTW Label with Low Rate",
  //   description: 'Detects "BTW" label followed by low tax rate and amount',
  //   applicableFields: ["taxLow"],
  //   conditions: [createRegexMatchCondition(/\bbtw\b.*?(9|6)%/i)],
  //   action: (elements, index, matchedConditions, formatInfo, context) => {
  //     // Try to extract value from current line
  //     const value = extractNumericValue(elements[index].text);
  //     if (value !== null) {
  //       return {
  //         field: "taxLow",
  //         value,
  //         confidence: 0.8,
  //         ruleId: "tax_label_with_rate_low",
  //       };
  //     }

  //     // Check nearby elements for values
  //     const rangeToCheck = 2;
  //     for (
  //       let i = Math.max(0, index - rangeToCheck);
  //       i <= Math.min(elements.length - 1, index + rangeToCheck);
  //       i++
  //     ) {
  //       if (i !== index) {
  //         const nearbyValue = extractNumericValue(elements[i].text);
  //         if (nearbyValue !== null) {
  //           // Confidence decreases with distance from the tax label
  //           const distanceConfidenceFactor = 1 - Math.abs(i - index) * 0.1;
  //           return {
  //             field: "taxLow",
  //             value: nearbyValue,
  //             confidence: 0.75 * distanceConfidenceFactor,
  //             ruleId: "tax_label_with_rate_low",
  //           };
  //         }
  //       }
  //     }

  //     return null;
  //   },
  //   priority: 15,
  // },

  // // Rule for "BTW" label followed by tax rate and amount
  // {
  //   id: "tax_label_with_rate_high",
  //   name: "BTW Label with High Rate",
  //   description: 'Detects "BTW" label followed by high tax rate and amount',
  //   applicableFields: ["taxHigh"],
  //   conditions: [createRegexMatchCondition(/\bbtw\b.*?(21|19)%/i)],
  //   action: (elements, index, matchedConditions, formatInfo, context) => {
  //     // Try to extract value from current line
  //     const value = extractNumericValue(elements[index].text);
  //     if (value !== null) {
  //       return {
  //         field: "taxHigh",
  //         value,
  //         confidence: 0.8,
  //         ruleId: "tax_label_with_rate_high",
  //       };
  //     }

  //     // Check nearby elements for values
  //     const rangeToCheck = 2;
  //     for (
  //       let i = Math.max(0, index - rangeToCheck);
  //       i <= Math.min(elements.length - 1, index + rangeToCheck);
  //       i++
  //     ) {
  //       if (i !== index) {
  //         const nearbyValue = extractNumericValue(elements[i].text);
  //         if (nearbyValue !== null) {
  //           // Confidence decreases with distance from the tax label
  //           const distanceConfidenceFactor = 1 - Math.abs(i - index) * 0.1;
  //           return {
  //             field: "taxHigh",
  //             value: nearbyValue,
  //             confidence: 0.75 * distanceConfidenceFactor,
  //             ruleId: "tax_label_with_rate_high",
  //           };
  //         }
  //       }
  //     }

  //     return null;
  //   },
  //   priority: 15,
  // },

  // // Rule for finding tax values on the same line as tax indicators
  // {
  //   id: "tax_same_line_detection",
  //   name: "Same Line Tax Detection",
  //   description:
  //     'Detects tax values on the same line as tax indicators like "BTW", "VAT"',
  //   applicableFields: ["taxLow", "taxHigh"],
  //   conditions: [
  //     createRegexMatchCondition(/(?:btw|BTW|vat|VAT|tax|TAX)/), // Match any tax indicator
  //   ],
  //   action(elements, index) {
  //     const element = elements[index];
  //     const text = element.text.toLowerCase();
  //     console.log(`[Tax Rule] Checking for tax values on line: ${text}`);

  //     // Extract decimal values on the same line
  //     const values = extractDecimalValues(element, "Same line");
  //     if (values.length === 0) {
  //       console.log(`[Tax Rule] No decimal values found on line: ${text}`);
  //       return null;
  //     }

  //     // Check if this line contains indicators for high or low tax
  //     let isHighTax = /(?:hoog|high|21%|21,0|21.0)/.test(text);
  //     let isLowTax = /(?:laag|low|9%|9,0|9.0)/.test(text);

  //     // If we can't determine high/low specifically, try to infer from percentage
  //     if (!isHighTax && !isLowTax && /\d+[,.]?\d*\s*%/.test(text)) {
  //       // Extract percentage
  //       const percentageMatch = text.match(/(\d+)[,.]?\d*\s*%/);
  //       if (percentageMatch) {
  //         const percentage = parseInt(percentageMatch[1], 10);
  //         if (percentage >= 15) {
  //           // Usually high tax is 21% in Netherlands
  //           console.log(
  //             `[Tax Rule] Inferred high tax from percentage: ${percentage}%`
  //           );
  //           isHighTax = true;
  //         } else if (percentage <= 10) {
  //           // Usually low tax is 9% in Netherlands
  //           console.log(
  //             `[Tax Rule] Inferred low tax from percentage: ${percentage}%`
  //           );
  //           isLowTax = true;
  //         }
  //       }
  //     }

  //     // Get the smallest value by default, unless there are specific patterns that suggest otherwise
  //     let value = Math.min(...values);

  //     // Log what we found
  //     console.log(
  //       `[Tax Rule] Found ${
  //         values.length
  //       } decimal values on line with tax indicator: ${values.join(", ")}`
  //     );
  //     console.log(
  //       `[Tax Rule] Selected value: ${value} (${
  //         isHighTax ? "high" : isLowTax ? "low" : "unknown"
  //       } tax)`
  //     );

  //     // If we detect specific tax types, return as that type
  //     if (isHighTax) {
  //       return {
  //         field: "taxHigh",
  //         value: value,
  //         confidence: 0.95,
  //         multipleResults: [
  //           {
  //             field: "taxLow",
  //             value: 0,
  //             confidence: 0.9,
  //             ruleId: "tax_same_line_detection",
  //           },
  //         ],
  //         ruleId: "tax_same_line_detection",
  //       };
  //     } else if (isLowTax) {
  //       return {
  //         field: "taxLow",
  //         value: value,
  //         confidence: 0.95,
  //         multipleResults: [
  //           {
  //             field: "taxHigh",
  //             value: 0,
  //             confidence: 0.9,
  //             ruleId: "tax_same_line_detection",
  //           },
  //         ],
  //         ruleId: "tax_same_line_detection",
  //       };
  //     } else {
  //       // If we can't determine high/low, just return the value as high tax by default
  //       return {
  //         field: "taxHigh",
  //         value: value,
  //         confidence: 0.8,
  //         ruleId: "tax_same_line_detection",
  //       };
  //     }
  //   },
  //   priority: 300, // Highest priority for tax detection
  // },

  // // Rule for tax percentage on same line as the amount
  // // Example: "21,00% btw over € 660,33" + "€ 138,67" on same line
  // {
  //   id: "tax_percentage_same_line",
  //   name: "Tax Percentage with Amount on Same Line",
  //   description:
  //     "Detects tax values by finding the smallest decimal on the same line as a tax percentage",
  //   applicableFields: ["taxHigh", "taxLow"],
  //   priority: 500, // Extremely high priority rule
  //   conditions: [
  //     // Tax percentage indicator (e.g., 21%, 9%, etc.)
  //     createRegexMatchCondition(/\d+[.,]\d*\s*%/i),
  //   ],
  //   action: (elements, index, _, formatInfo) => {
  //     const element = elements[index];
  //     const text = element.text.toLowerCase();

  //     // Log all matching elements for debugging
  //     console.log(
  //       `[Tax Rule Debug] Checking element with tax percentage: "${text}"`
  //     );

  //     // Only proceed if this contains btw/vat keywords or is a typical tax percentage
  //     // Specifically looking for percentages like 21,00% used in Expert receipts
  //     const hasTaxKeyword = /(?:btw|vat|tax)/i.test(text);
  //     const hasTaxPercentage =
  //       /(?:21[.,]\d*|19[.,]\d*|9[.,]\d*|6[.,]\d*)\s*%/i.test(text);

  //     if (!hasTaxKeyword && !hasTaxPercentage) {
  //       console.log(
  //         `[Tax Rule Debug] Skipping - no tax keyword or standard percentage`
  //       );
  //       return null;
  //     }

  //     console.log(
  //       `[Tax Same Line] Found tax percentage at element[${index}]: "${text}"`
  //     );

  //     // Extract the percentage to determine if it's high or low tax
  //     const percentageMatch = text.match(/(\d+)[.,]?\d*\s*%/);
  //     if (!percentageMatch) return null;

  //     const percentage = parseInt(percentageMatch[1], 10);
  //     const isHighTax = percentage >= 15; // High tax is typically 21%
  //     const field = isHighTax ? "taxHigh" : "taxLow";

  //     // Check for specific Expert receipt format ("21,00% btw over € 660,33")
  //     const isExpertReceiptFormat = /\d+[.,]\d+\s*%\s*btw\s*over/.test(text);
  //     if (isExpertReceiptFormat) {
  //       console.log(`[Tax Rule Debug] Found Expert receipt format: "${text}"`);
  //       // For Expert receipts, we need to look at nearby elements, not just same line
  //       // This is because the tax amount is typically on a different line

  //       // Check next element specifically
  //       if (index + 1 < elements.length) {
  //         const nextElement = elements[index + 1];
  //         const nextText = nextElement.text;

  //         console.log(`[Tax Rule Debug] Next element: "${nextText}"`);

  //         // If it's a valid tax value, use it directly
  //         if (isValidTaxValue(nextText)) {
  //           const value = parseFloat(
  //             nextText.replace(/[^0-9.,]/g, "").replace(",", ".")
  //           );
  //           console.log(
  //             `[Tax Rule Debug] Found tax value in next element: ${value}`
  //           );

  //           return {
  //             field: "taxHigh", // Expert receipt uses 21% tax
  //             value,
  //             confidence: 0.99, // Very high confidence
  //             ruleId: "tax_percentage_same_line",
  //           };
  //         }
  //       }
  //     }

  //     // Use looser tolerance for Expert receipt format
  //     const tolerance = isExpertReceiptFormat ? 20 : 6;

  //     // Look for decimal values on the same line with appropriate tolerance
  //     const allElements = elements.filter(
  //       (el) =>
  //         el.topLeft &&
  //         element.topLeft &&
  //         Math.abs((el.topLeft[1] || 0) - (element.topLeft[1] || 0)) < tolerance
  //     );

  //     console.log(
  //       `\n[TAX DEBUG] ============== DETAILED SPATIAL ANALYSIS =============`
  //     );
  //     console.log(
  //       `[TAX DEBUG] Original element[${index}]: "${text}" at Y=${
  //         element.topLeft ? element.topLeft[1] : "unknown"
  //       }`
  //     );
  //     console.log(
  //       `[TAX DEBUG] Using tolerance: ${tolerance} for Y-coordinate matching`
  //     );
  //     console.log(
  //       `[TAX DEBUG] Found ${allElements.length} elements on the same line/nearby`
  //     );

  //     // Print all elements with their Y positions for debugging
  //     elements.forEach((el, idx) => {
  //       if (!el.topLeft) return;
  //       const yDiff = element.topLeft
  //         ? Math.abs(el.topLeft[1] - element.topLeft[1])
  //         : "unknown";
  //       const isOnSameLine = element.topLeft
  //         ? Math.abs(el.topLeft[1] - element.topLeft[1]) < tolerance
  //         : false;
  //       console.log(
  //         `[TAX DEBUG] Element[${idx}]: "${el.text}" at Y=${el.topLeft[1]}, diff=${yDiff}, onSameLine=${isOnSameLine}`
  //       );
  //     });

  //     // Extract all valid decimal values
  //     const decimalValues: number[] = [];
  //     allElements.forEach((el) => {
  //       if (el === element) return; // Skip the tax percentage element itself

  //       // Only consider elements with valid tax formats (single decimal separator, 2 decimal places)
  //       if (!isValidTaxValue(el.text)) {
  //         console.log(
  //           `[Tax Same Line] Skipping invalid tax format: "${el.text}"`
  //         );
  //         return;
  //       }

  //       const matches = el.text.match(/\d+[.,]\d+/g);
  //       if (matches) {
  //         matches.forEach((match) => {
  //           const value = parseFloat(match.replace(",", "."));
  //           decimalValues.push(value);
  //           console.log(
  //             `[Tax Same Line] Found decimal value: ${value} in "${el.text}"`
  //           );
  //         });
  //       }
  //     });

  //     if (decimalValues.length === 0) {
  //       console.log(
  //         `[Tax Same Line] No decimal values found on same line as tax percentage`
  //       );
  //       return null;
  //     }

  //     // Sort values and take the smallest as the tax amount
  //     decimalValues.sort((a, b) => a - b);
  //     const taxValue = decimalValues[0];

  //     console.log(
  //       `[Tax Same Line] Selected ${field}: ${taxValue} (smallest decimal on same line as tax percentage)`
  //     );

  //     return {
  //       field,
  //       value: taxValue,
  //       confidence: 0.95, // High confidence
  //       ruleId: "tax_percentage_same_line",
  //     };
  //   },
  // },

  // // Enhanced rule for percentage-based tax detection
  // // Handles formats like "21,00% btw over € 660,33" with the tax amount (€ 138,67) nearby
  // {
  //   id: "tax_percentage_from_total",
  //   name: "Tax Percentage from Total",
  //   description:
  //     "Generic rule that detects tax amount by looking at percentage statements and nearby values",
  //   applicableFields: ["taxHigh", "taxLow"],
  //   priority: 400, // Very high priority rule
  //   conditions: [
  //     // The text contains a percentage mention plus btw/vat keywords
  //     createRegexMatchCondition(/\d+[.,]\d+\s*%.*?(?:btw|vat)/i),
  //   ],
  //   action: (elements, index, _, formatInfo) => {
  //     const element = elements[index];
  //     const text = element.text.toLowerCase();

  //     console.log(`[Tax Percentage] Found tax percentage indicator: "${text}"`);

  //     // Extract the percentage to determine tax type (high/low)
  //     const percentageMatch = text.match(/(\d+)[.,]\d+\s*%/);
  //     if (!percentageMatch) return null;

  //     const percentage = parseInt(percentageMatch[1], 10);
  //     const isHighTax = percentage >= 15; // High tax is typically 21%
  //     const field = isHighTax ? "taxHigh" : "taxLow";

  //     // Extract the base amount if present (e.g., "over € 660,33")
  //     const baseAmountMatch = text.match(
  //       /(?:over|from|van)\s*(?:€|\$|£)?\s*(\d+[.,]\d+)/
  //     );
  //     let calculatedTaxAmount = null;

  //     if (baseAmountMatch) {
  //       const baseAmount = parseFloat(baseAmountMatch[1].replace(",", "."));
  //       calculatedTaxAmount = (percentage / 100) * baseAmount;
  //       console.log(
  //         `[Tax Percentage] Base amount: ${baseAmount}, calculated tax: ${calculatedTaxAmount.toFixed(
  //           2
  //         )}`
  //       );
  //     }

  //     // Strategy 1: Check if the next element contains the tax amount
  //     if (index + 1 < elements.length) {
  //       const nextElement = elements[index + 1];
  //       const nextText = nextElement.text;

  //       console.log(`[Tax Percentage] Checking next element: "${nextText}"`);

  //       // If it's a single valid tax value, use it
  //       if (isValidTaxValue(nextText)) {
  //         const value = parseFloat(
  //           nextText.replace(/[^0-9.,]/g, "").replace(",", ".")
  //         );
  //         console.log(
  //           `[Tax Percentage] Found valid tax value in next element: ${value}`
  //         );

  //         // Verify against calculated value if available
  //         if (
  //           calculatedTaxAmount &&
  //           Math.abs(value - calculatedTaxAmount) > 1
  //         ) {
  //           console.log(
  //             `[Tax Percentage] Warning: Next element value ${value} doesn't match calculated tax ${calculatedTaxAmount.toFixed(
  //               2
  //             )}`
  //           );
  //         }

  //         return {
  //           field,
  //           value,
  //           confidence: 0.98, // Very high confidence
  //           ruleId: "tax_percentage_from_total",
  //         };
  //       }
  //     }

  //     // Strategy 2: Look for smaller values nearby (within 3 elements) that could be tax amounts
  //     const searchRadius = 3;
  //     const validTaxValues: { element: TextElement; value: number }[] = [];

  //     for (
  //       let i = Math.max(0, index - searchRadius);
  //       i <= Math.min(elements.length - 1, index + searchRadius);
  //       i++
  //     ) {
  //       if (i === index) continue; // Skip the percentage element itself

  //       const nearbyElement = elements[i];
  //       const nearbyText = nearbyElement.text;

  //       // Only consider elements that are valid tax values
  //       if (!isValidTaxValue(nearbyText)) continue;

  //       // Extract the decimal value
  //       const matches = nearbyText.match(/\d+[.,]\d+/g);
  //       if (!matches) continue;

  //       matches.forEach((match) => {
  //         const value = parseFloat(match.replace(",", "."));

  //         // Skip large values that are likely totals, not tax amounts
  //         if (value > 200) {
  //           console.log(
  //             `[Tax Percentage] Skipping large value: ${value} (likely total, not tax)`
  //           );
  //           return;
  //         }

  //         validTaxValues.push({ element: nearbyElement, value });
  //         console.log(
  //           `[Tax Percentage] Found potential tax value: ${value} in "${nearbyText}"`
  //         );
  //       });
  //     }

  //     if (validTaxValues.length > 0) {
  //       // If we have a calculated amount, find the closest match
  //       if (calculatedTaxAmount) {
  //         validTaxValues.sort(
  //           (a, b) =>
  //             Math.abs(a.value - calculatedTaxAmount) -
  //             Math.abs(b.value - calculatedTaxAmount)
  //         );

  //         const closestMatch = validTaxValues[0];
  //         console.log(
  //           `[Tax Percentage] Selected ${field}: ${
  //             closestMatch.value
  //           } (closest to calculated ${calculatedTaxAmount.toFixed(2)})`
  //         );

  //         return {
  //           field,
  //           value: closestMatch.value,
  //           confidence: 0.97,
  //           ruleId: "tax_percentage_from_total",
  //         };
  //       }

  //       // Otherwise, sort by value and take the smallest (typical tax values are smaller than totals)
  //       validTaxValues.sort((a, b) => a.value - b.value);
  //       const smallestValue = validTaxValues[0];

  //       console.log(
  //         `[Tax Percentage] Selected ${field}: ${smallestValue.value} (smallest nearby value)`
  //       );

  //       return {
  //         field,
  //         value: smallestValue.value,
  //         confidence: 0.96,
  //         ruleId: "tax_percentage_from_total",
  //       };
  //     }

  //     // Strategy 3: If we have calculated the tax amount, use it as a fallback
  //     if (calculatedTaxAmount) {
  //       console.log(
  //         `[Tax Percentage] Using calculated tax amount: ${calculatedTaxAmount.toFixed(
  //           2
  //         )}`
  //       );

  //       return {
  //         field,
  //         value: Number(calculatedTaxAmount.toFixed(2)),
  //         confidence: 0.9,
  //         ruleId: "tax_percentage_from_total",
  //       };
  //     }

  //     return null;
  //   },
  // },

  // // Rule for Dutch "X% btw over € Y" format (percentage tax over amount)
  // {
  //   id: "tax_percentage_over_amount",
  //   name: "Tax Percentage Over Amount",
  //   description:
  //     'Detects tax values in Dutch receipts with format "X% btw over € Y"',
  //   applicableFields: ["taxLow", "taxHigh"],
  //   conditions: [
  //     createRegexMatchCondition(
  //       /\d+(?:[,.]\d+)?\s*%\s*(?:btw|BTW)\s*(?:over)\s*[€€]?\s*\d+(?:[,.]\d+)?/
  //     ),
  //   ],
  //   action(elements, index) {
  //     // Extract the values from the matched element
  //     const text = elements[index].text;
  //     console.log(`[Tax Rule] Found "percentage over amount" format: ${text}`);

  //     // Extract the percentage and the amount
  //     const percentageMatch = text.match(/(\d+(?:[,.]\d+)?)\s*%/);
  //     const amountMatch = text.match(/[€€]?\s*(\d+(?:[,.]\d+)?)$/);

  //     if (!percentageMatch || !amountMatch) {
  //       console.log(`[Tax Rule] Failed to extract values from: ${text}`);
  //       return null;
  //     }

  //     const percentage = parseFloat(percentageMatch[1].replace(",", "."));
  //     const baseAmount = parseFloat(amountMatch[1].replace(",", "."));

  //     // Calculate the tax amount
  //     const taxAmount = baseAmount * (percentage / 100);
  //     console.log(
  //       `[Tax Rule] Calculated tax: ${baseAmount} * ${percentage}% = ${taxAmount}`
  //     );

  //     // Determine if this is high or low tax based on the percentage
  //     // In the Netherlands, high tax rate is typically 21%, low is 9%
  //     const isHighTax = percentage >= 15; // If >= 15%, assume it's high tax

  //     // Look for the actual tax amount nearby
  //     let actualTaxAmount = null;
  //     for (let i = 0; i < elements.length; i++) {
  //       // Skip the current element
  //       if (i === index) continue;

  //       const element = elements[i];
  //       if (!element.text) continue;

  //       // Check if this element is close to the tax indicator
  //       const isSpatiallyClose = isSpatiallyNear(elements[index], element, 10);

  //       if (isSpatiallyClose) {
  //         // Look for decimal values that might be the tax amount
  //         const extractedValues = extractDecimalValues(
  //           element,
  //           "Nearby element"
  //         );

  //         // Find a value close to our calculated tax amount
  //         const matchingValue = extractedValues.find(
  //           (val) => Math.abs(val - taxAmount) < 0.1
  //         );

  //         if (matchingValue) {
  //           console.log(
  //             `[Tax Rule] Found matching tax amount: ${matchingValue}`
  //           );
  //           actualTaxAmount = matchingValue;
  //           break;
  //         }
  //       }
  //     }

  //     // Use the calculated amount if we couldn't find an actual amount
  //     const finalTaxAmount =
  //       actualTaxAmount !== null ? actualTaxAmount : taxAmount;

  //     // If there's zero tax for the opposite category, explicitly return it
  //     if (isHighTax) {
  //       // Return high tax and set low tax to 0
  //       console.log(
  //         `[Tax Rule] Setting taxHigh=${finalTaxAmount.toFixed(2)}, taxLow=0`
  //       );
  //       return {
  //         field: "taxHigh",
  //         value: finalTaxAmount,
  //         confidence: 0.9,
  //         multipleResults: [
  //           {
  //             field: "taxLow",
  //             value: 0,
  //             confidence: 0.9,
  //             ruleId: "tax_percentage_over_amount",
  //           },
  //         ],
  //         ruleId: "tax_percentage_over_amount",
  //       };
  //     } else {
  //       // Return low tax and set high tax to 0
  //       console.log(
  //         `[Tax Rule] Setting taxLow=${finalTaxAmount.toFixed(2)}, taxHigh=0`
  //       );
  //       return {
  //         field: "taxLow",
  //         value: finalTaxAmount,
  //         confidence: 0.9,
  //         multipleResults: [
  //           {
  //             field: "taxHigh",
  //             value: 0,
  //             confidence: 0.9,
  //             ruleId: "tax_percentage_over_amount",
  //           },
  //         ],
  //         ruleId: "tax_percentage_over_amount",
  //       };
  //     }
  //   },
  //   priority: 200, // Very high priority since this is a clear format
  // },

  // // Rule for tax values based on percentage of total
  // {
  //   id: "tax_percentage_of_total_high",
  //   name: "Percentage of Total (High Tax)",
  //   description:
  //     "Detects potential high tax values based on percentage of total",
  //   applicableFields: ["taxHigh"],
  //   conditions: [createRegexMatchCondition(/\d+[.,]\d+/)],
  //   action: (elements, index, matchedConditions) => {
  //     const value = extractNumericValue(elements[index].text);
  //     if (value === null || value <= 0) return null;

  //     // First check if any high tax indicator is present in the receipt
  //     const highTaxIndicatorFound = elements.some((element) => {
  //       const text = element.text.toLowerCase();
  //       return (
  //         text.includes("hoog") || text.includes("21%") || text.includes("19%")
  //       );
  //     });

  //     // If no high tax indicator found, don't apply this rule
  //     if (!highTaxIndicatorFound) {
  //       console.log(
  //         `[Tax % High] No high tax indicators found in receipt, skipping high tax estimation`
  //       );
  //       return null;
  //     }

  //     // Check if value is close to 21% or 19% of any other larger value
  //     // This helps identify tax values when the total is known
  //     for (const element of elements) {
  //       const elementValue = extractNumericValue(element.text);
  //       if (elementValue === null || elementValue <= value) continue;

  //       // Calculate potential tax percentages
  //       const percentageOfLarger = (value / elementValue) * 100;

  //       // Check if it's close to the Dutch high tax rates (19% or 21%)
  //       if (
  //         Math.abs(percentageOfLarger - 21) < 1 ||
  //         Math.abs(percentageOfLarger - 19) < 1
  //       ) {
  //         console.log(
  //           `[Tax % High] Found value ${value} that is close to 21% of ${elementValue} (${percentageOfLarger.toFixed(
  //             2
  //           )}%)`
  //         );
  //         return {
  //           field: "taxHigh",
  //           value,
  //           confidence: 0.7,
  //           ruleId: "tax_percentage_of_total_high",
  //         };
  //       }
  //     }

  //     return null;
  //   },
  //   priority: 5,
  // },
];
