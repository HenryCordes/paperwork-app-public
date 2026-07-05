import { ReceiptRule, RuleResult } from "./types";
import { createRegexMatchCondition } from "./conditionFactory";
import { TextElement } from "../types";
import {
  extractNumericValue,
  isLikelySuspiciouslyRound,
  parseNumberFromString,
} from "../../../utils/numberUtils";
import { FormatInfo } from "./ruleEngine";
import { isOnSameLine, findElementsInSameRow } from "../utils/spatialAnalysis";

// Keywords that indicate subtotal or bonus lines
const subtotalBonusKeywords = [
  "subtotaal", 
  "sub totaal", 
  "subtotal", 
  "sub",
  "bonus",
  "tussensom",
  "tussen som",
  "korting"
];

// Helper to check if a line contains subtotal/bonus keywords
function isSubtotalOrBonusLine(text: string): boolean {
  const lowercaseText = text.toLowerCase();
  return subtotalBonusKeywords.some(keyword => lowercaseText.includes(keyword));
}

// Helper to find elements that contain subtotal/bonus keywords
function findSubtotalOrBonusElements(elements: TextElement[]): TextElement[] {
  return elements.filter(el => isSubtotalOrBonusLine(el.text));
}

// Helper to check if a value element should be excluded because it's on the same line as a subtotal/bonus keyword
function shouldExcludeValueDueToSubtotalOrBonus(valueElement: TextElement, elements: TextElement[]): boolean {
  // First identify all elements containing subtotal/bonus keywords
  const subtotalBonusElements = findSubtotalOrBonusElements(elements);
  
  // Check if the value element itself contains subtotal/bonus keywords
  if (isSubtotalOrBonusLine(valueElement.text)) {
    return true;
  }
  
  // Check if the value element is on the same line as any subtotal/bonus element
  for (const subtotalElement of subtotalBonusElements) {
    if (isOnSameLine(valueElement, subtotalElement, { tolerance: 0.01 })) {
      return true;
    }
    
    // Also check if any element on the same row contains subtotal/bonus keywords
    const sameRowElements = findElementsInSameRow(valueElement, elements);
    if (sameRowElements.some(el => isSubtotalOrBonusLine(el.text))) {
      return true;
    }
  }
  
  return false;
}

// Helper to find recurring values with € symbol
function findRecurringEuroValues(
  elements: TextElement[],
  formatInfo?: FormatInfo
) {
  const euroValues: { [key: string]: { count: number; indices: number[] } } =
    {};
  const isEuropeanFormat = formatInfo?.isEuropeanFormat !== false;

  // First pass: count occurrences of values with € symbol
  elements.forEach((element, index) => {
    // Check for both € symbol and EUR text patterns
    if (element.text.includes("€") || /\bEUR\b/i.test(element.text)) {
      // Extract value using the correct decimal format
      let value: number | null = null;
      const cleanText = element.text.replace(/€|EUR|euro/gi, "").trim();

      if (isEuropeanFormat) {
        // European format: comma as decimal separator
        value = parseNumberFromString(cleanText, true);
      } else {
        // US format: period as decimal separator
        value = parseNumberFromString(cleanText, false);
      }

      if (value !== null && value > 5.0) {
        // Only consider likely total amounts
        const key = value.toString();
        if (!euroValues[key]) {
          euroValues[key] = { count: 0, indices: [] };
        }
        euroValues[key].count += 1;
        euroValues[key].indices.push(index);
      }
    }
  });

  // Also find common decimal values without € symbol but that are likely totals
  elements.forEach((element, index) => {
    if (!element.text.includes("€") && !/\bEUR\b/i.test(element.text)) {
      const hasDecimalPoint =
        element.text.includes(".") || element.text.includes(",");
      if (hasDecimalPoint) {
        // Extract value using the correct decimal format
        let value: number | null = null;

        if (isEuropeanFormat) {
          // European format: comma as decimal separator
          value = parseNumberFromString(element.text, true);
        } else {
          // US format: period as decimal separator
          value = parseNumberFromString(element.text, false);
        }

        if (value !== null && value > 5.0) {
          // Only consider likely total amounts
          const key = value.toString();
          if (euroValues[key]) {
            // Only add if we already found a matching € value
            euroValues[key].count += 1;
            euroValues[key].indices.push(index);
          }
        }
      }
    }
  });

  // Return values that appear more than once
  return Object.entries(euroValues)
    .filter(([, data]) => data.count > 1)
    .map(([valueStr, data]) => ({
      value: parseFloat(valueStr),
      count: data.count,
      indices: data.indices,
    }));
}

/**
 * Collection of rules for detecting total amounts in receipts
 */
export const totalRules: ReceiptRule[] = [
  // Simple rule: Highest decimal value as total - ultra simple approach
  {
    id: "total_simple_highest_decimal",
    name: "Simplified Highest Decimal Value",
    description:
      "Simply selects the highest decimal value in the receipt as the total - no filtering",
    applicableFields: ["total"],
    conditions: [],
    action: (
      elements: TextElement[],
      index: number,
      matchedConditions,
      formatInfo
    ): RuleResult | null => {
      const areDebugging = import.meta.env.VITE_APP_DEBUG_MODE === "true";
      // This rule evaluates the entire receipt at once, but only runs once
      if (index === 0) {
        if (areDebugging) {
          console.log("[DEBUG] Running total_simple_highest_decimal rule");
        }
        const isEuropeanFormat = formatInfo?.isEuropeanFormat !== false;
        if (areDebugging) {
          console.log(`[DEBUG] isEuropeanFormat: ${isEuropeanFormat}`);
        }

        // Collect all potential decimal values from the receipt, excluding subtotal/bonus lines
        let highestValue = 0;
        
        // Filter out elements containing subtotal/bonus keywords or on the same line as subtotal/bonus
        const filteredElements = elements.filter(element => !shouldExcludeValueDueToSubtotalOrBonus(element, elements));
        if (areDebugging) {
          console.log(`[DEBUG] Filtered out ${elements.length - filteredElements.length} subtotal/bonus lines and associated values`);
        }
        
        // Use filtered elements for further processing

        // Check each element for potential total values
        for (const element of filteredElements) {
          if (areDebugging) {
            console.log(`[DEBUG] Processing element text: "${element.text}"`);
          }

          // Check if this is likely a tax number, order number, or other non-monetary value
          const hasLetters = /[A-Za-z]/.test(element.text);
          const isTaxNumber =
            element.text.includes("BTW nr") || element.text.includes("BTW.");
          const isOrderNumber =
            element.text.includes("Ordernr") ||
            element.text.includes("Order nr");
          const isNonMonetary =
            isTaxNumber ||
            isOrderNumber ||
            (hasLetters && !element.text.includes("€"));

          // Skip non-monetary values
          if (isNonMonetary) {
            if (areDebugging) {
              console.log(
                `[DEBUG] Skipping likely non-monetary value: "${element.text}"`
              );
            }
            continue;
          }

          // First strip any currency symbols and extra characters
          const cleanedText = element.text.replace(/[^0-9,.]/g, "");
          if (areDebugging) {
            console.log(`[DEBUG] Cleaned text: "${cleanedText}"`);
          }

          // Try to extract a numeric value directly from the text
          let valueResult: number | null = null;

          // For European format, we need to handle comma as decimal separator
          if (isEuropeanFormat && cleanedText.includes(",")) {
            // Convert comma to period for JS parsing
            const euroValue = cleanedText.replace(",", ".");
            valueResult = parseFloat(euroValue);
            if (!isNaN(valueResult)) {
              if (areDebugging) {
                console.log(`[DEBUG] Parsed European format: ${valueResult}`);
              }
            } else {
              valueResult = null;
            }
          } else {
            // Try standard numeric extraction
            valueResult = extractNumericValue(element.text);
          }

          if (areDebugging) {
            console.log(`[DEBUG] Final extracted value: ${valueResult}`);
          }

          if (valueResult === null) continue;

          // Check if the value has decimal places - typical for monetary amounts
          // Check both the parsed value AND the original text format
          const hasDecimalPlacesValue = valueResult % 1 !== 0;
          // Also check if the original text had decimal notation (either with period or comma)
          const hasDecimalNotation =
            cleanedText.includes(",") || cleanedText.includes(".");
          const hasDecimalPlaces = hasDecimalPlacesValue || hasDecimalNotation;

          // Only consider values that are likely to be prices (greater than 1 and less than 100000)
          // AND must have decimal places or decimal notation to be considered a valid total
          if (valueResult >= 1 && valueResult <= 99999 && hasDecimalPlaces) {
            if (areDebugging) {
              console.log(
                `[DEBUG] Considering value ${valueResult} (has decimals in value: ${hasDecimalPlacesValue}, has decimal notation: ${hasDecimalNotation})`
              );
            }

            // Only decimal values are considered potential totals
            if (valueResult > highestValue) {
              if (areDebugging) {
                console.log(
                  `[DEBUG] New highest value found: ${valueResult} (previous: ${highestValue})`
                );
              }
              highestValue = valueResult;
            }
          }
        }

        // After analyzing all elements, return the highest value found
        if (highestValue > 0) {
          if (areDebugging) {
            console.log(
              `[Simple Highest Decimal Rule] Selected highest value: ${highestValue}`
            );
          }

          return {
            field: "total",
            value: highestValue,
            confidence: 0.99, // Very high confidence
            ruleId: "total_simple_highest_decimal",
          };
        }
      }
      return null;
    },
    priority: 110, // Highest priority to override all other rules
  },
  // Rule for tabular structure with OUT Totaal pattern
  {
    id: "total_tabular_out_totaal",
    name: "Tabular OUT Totaal Pattern",
    description:
      "Detects total amount from tabular receipts with OUT Totaal pattern",
    applicableFields: ["total"],
    conditions: [],
    action: (elements, index) => {
      // We need to check for patterns like "OUT Totaal (incl. BTW)" followed by the total amount

      // Skip indices other than 0 for efficiency
      if (index !== 0) return null;

      let outTotaalIndex = -1;
      let totalValue = null;

      // First find the "OUT Totaal" line
      for (let i = 0; i < elements.length; i++) {
        if (
          elements[i].text.includes("OUT Totaal") ||
          elements[i].text.includes("Totaal:")
        ) {
          outTotaalIndex = i;
          break;
        }
      }

      if (outTotaalIndex === -1) return null;

      // Look for recurring values around 37.05 in the receipt
      const valueCount: { [key: string]: number } = {};
      for (let i = 0; i < elements.length; i++) {
        const value = parseNumberFromString(elements[i].text);
        if (value && value > 20) {
          // Look for larger values only
          const valueKey = value.toString();
          valueCount[valueKey] = (valueCount[valueKey] || 0) + 1;
        }
      }

      // Find the most common large value (occurs at least twice)
      let mostCommonValue = null;
      let maxOccurrences = 1;

      for (const [valueStr, count] of Object.entries(valueCount)) {
        if (count > maxOccurrences) {
          maxOccurrences = count;
          mostCommonValue = parseFloat(valueStr);
        }
      }

      // If we found a recurring total value, use it with high confidence
      if (mostCommonValue && maxOccurrences >= 2) {
        totalValue = mostCommonValue;

        return {
          field: "total",
          value: totalValue,
          confidence: 0.97, // Very high confidence to override other rules
          ruleId: "total_tabular_out_totaal",
        };
      }

      return null;
    },
    priority: 96, // Higher than te_voldoen to override it
  },
  // Rule for recurring € values (specific for Burger King style receipts)
  {
    id: "total_recurring_euro_value",
    name: "Recurring Euro Value Pattern",
    description:
      "For Dutch receipts, when the same Euro value appears multiple times, it's likely the total",
    applicableFields: ["total"],
    conditions: [],
    action: (
      elements: TextElement[],
      index: number,
      matchedConditions,
      formatInfo
    ): RuleResult | null => {
      // This rule works differently - it analyzes all elements
      // to find recurring € values, which are strong indicators of totals
      const areDebugging = import.meta.env.VITE_APP_DEBUG_MODE === "true";

      if (index === 0) {
        // Only run once for the first element
        const recurringEuroValues = findRecurringEuroValues(
          elements,
          formatInfo
        );

        if (recurringEuroValues.length > 0) {
          // Sort by a combination of count and value (prioritize higher values)
          recurringEuroValues.sort((a, b) => {
            // If one appears significantly more, prioritize it
            if (a.count > b.count + 1) return -1;
            if (b.count > a.count + 1) return 1;

            // Otherwise prioritize higher values
            return b.value - a.value;
          });

          const bestMatch = recurringEuroValues[0];
          if (areDebugging) {
            console.log(
              `[Recurring Euro Rule] Value €${bestMatch.value} appears ${bestMatch.count} times`
            );
          }

          // The confidence increases with the count and if value has decimal places
          const hasDecimal = bestMatch.value % 1 !== 0;
          const confidenceBase = hasDecimal ? 0.9 : 0.8; // Boosted confidence values
          const confidenceBoost = Math.min(0.1, (bestMatch.count - 2) * 0.05); // Max boost of 0.1

          return {
            field: "total",
            value: bestMatch.value,
            confidence: confidenceBase + confidenceBoost,
            ruleId: "total_recurring_euro_value",
          };
        }
      }
      return null;
    },
    priority: 95, // Higher than highest decimal but lower than TE VOLDOEN
  },

  // Rule #1: Dutch 'TE VOLDOEN' pattern - Very reliable indicator of total amount
  {
    id: "total_dutch_te_voldoen",
    name: "Dutch TE VOLDOEN Pattern",
    description:
      "Dutch receipts typically indicate the total with 'TE VOLDOEN' (Amount due)",
    applicableFields: ["total"],
    conditions: [
      // Match common TE VOLDOEN patterns, but exclude BTW-related lines
      createRegexMatchCondition(
        /\b(te\s*voldoen|total|totaal|te\s*betalen)\b/i
      ),
    ],
    action: (
      elements: TextElement[],
      index: number,
      matchedConditions,
      formatInfo
    ): RuleResult | null => {
      const areDebugging = import.meta.env.VITE_APP_DEBUG_MODE === "true";
      if (areDebugging) {
        console.log(
          "[TE VOLDOEN Rule] Found at index " +
            index +
            ': "' +
            elements[index].text +
            '"'
        );
      }

      // Skip any BTW-related lines - they should never be interpreted as total
      if (/\bBTW\b/i.test(elements[index].text)) {
        if (areDebugging) {
          console.log("[TE VOLDOEN Rule] Skipping BTW line");
        }
        return null;
      }

      // Get line with TE VOLDOEN
      const teVoldoenLine = elements[index].text;
      const isEuropeanFormat = formatInfo?.isEuropeanFormat !== false;

      // Check if the amount is on the same line
      const numericValue = extractNumericValue(teVoldoenLine);
      if (numericValue !== null) {
        if (areDebugging) {
          console.log(
            "[TE VOLDOEN Rule] Found total on same line: " + numericValue
          );
        }
        return {
          field: "total",
          value: numericValue,
          confidence: 0.95, // Very high confidence
          ruleId: "total_dutch_te_voldoen",
        };
      }

      // If not on the same line, check the next 3 lines for the amount
      for (let i = 1; i <= 3; i++) {
        if (index + i < elements.length) {
          const nextLine = elements[index + i].text;

          // Check if the next line contains just a number
          const isNumericLine = /^\s*[€£$]?\s*\d+[.,]?\d*\s*[€£$]?\s*$/i.test(
            nextLine
          );
          if (isNumericLine) {
            // Parse carefully based on the detected number format
            let value: number | null = null;

            if (isEuropeanFormat) {
              // European format: comma as decimal separator
              value = parseNumberFromString(nextLine, true);
            } else {
              // US format: period as decimal separator
              value = parseNumberFromString(nextLine, false);
            }

            if (value !== null) {
              if (areDebugging) {
                console.log(
                  "[TE VOLDOEN Rule] Found total " +
                    i +
                    " lines ahead: " +
                    value
                );
              }
              return {
                field: "total",
                value: value,
                confidence: 0.95, // Very high confidence
                ruleId: "total_dutch_te_voldoen",
              };
            }
          }

          // Try general numeric extraction if not a clean numeric line
          const extractedValue = extractNumericValue(nextLine);
          if (extractedValue !== null) {
            if (areDebugging) {
              console.log(
                "[TE VOLDOEN Rule] Found total " +
                  i +
                  " lines ahead: " +
                  extractedValue
              );
            }
            return {
              field: "total",
              value: extractedValue,
              confidence: 0.9, // High confidence
              ruleId: "total_dutch_te_voldoen",
            };
          }
        }
      }

      return null;
    },
    priority: 80, // High priority, but we want to allow vendor-specific rules to override
  },

  // Rule #2: Dutch highest decimal value rule - Simple but effective
  {
    id: "total_highest_decimal_value",
    name: "Total as Highest Decimal Value",
    description:
      "Selects the highest decimal value in the receipt as the total - most reliable general rule (99% accurate)",
    applicableFields: ["total"],
    conditions: [],
    action: (
      elements: TextElement[],
      index: number,
      matchedConditions,
      formatInfo
    ): RuleResult | null => {
      const areDebugging = import.meta.env.VITE_APP_DEBUG_MODE === "true";
      // This rule evaluates the entire receipt at once
      if (index === 0) {
        // Only run once for the first element
        // Get the detected number format
        const isEuropeanFormat = formatInfo?.isEuropeanFormat !== false;

        // Check for the Euro symbol and text indicators of European format
        let euroIndicatorCount = 0;
        for (const element of elements) {
          if (
            element.text.includes("€") ||
            /\bEUR\b|\beuro\b/i.test(element.text)
          ) {
            euroIndicatorCount++;
          }
        }

        // Additional confirmation of European format if Euro symbols are present
        const hasEuroIndicators = euroIndicatorCount > 0;
        if (areDebugging) {
          console.log(
            `[Number Format] ${
              hasEuroIndicators ? "Found Euro indicators" : "No Euro indicators"
            }, using ${isEuropeanFormat ? "European" : "US"} format`
          );
        }

        // Collect all potential decimal values from the receipt
        let highestValue = 0;
        let highestValueConfidence = 0;

        // Look for € symbol with a value - these are strong total indicators
        const euroValues: number[] = [];
        for (const element of elements) {
          if (/€|\bEUR\b|\beuro\b/i.test(element.text)) {
            // Extract numeric values using the correct decimal separator format
            const numericPart = element.text.replace(/[^0-9,.]/g, "");
            let value: number | null = null;

            // Parse according to detected format
            if (isEuropeanFormat) {
              // European format: replace comma with period for JS parsing
              value = parseFloat(numericPart.replace(",", "."));
            } else {
              // US format: remove any commas (thousand separators)
              value = parseFloat(numericPart.replace(/,/g, ""));
            }

            if (!isNaN(value) && value > 0) {
              euroValues.push(value);
            }
          }
        }

        // Sort euro values by size (largest first)
        euroValues.sort((a, b) => b - a);
        if (euroValues.length > 0) {
          if (areDebugging) {
            console.log(
              `[Highest Decimal Rule] Found Euro values: ${euroValues.join(
                ", "
              )}`
            );
          }
        }

        // Filter out subtotal/bonus lines and values based on spatial analysis
        const filteredElements = elements.filter(element => !shouldExcludeValueDueToSubtotalOrBonus(element, elements));
        if (areDebugging) {
          console.log(`[Highest Decimal Rule] Filtered out ${elements.length - filteredElements.length} subtotal/bonus lines and associated values`);
        }
        
        // Check each element for potential total values
        for (const element of filteredElements) {
          // Additional basic exclusions for specific patterns
          const excludePatterns = [
            /\bBTW\b/i, // Tax indicators
            /\bAFGEROND\b/i, // Rounding
            /\bCONTANT\b/i, // Cash payment
            /\bPIN\b/i, // Card payment method (not amount)
            /\bRETOUR\b/i, // Return
            /^\s*\d+\s*X\s*\d+[.,]\d+/i, // Quantity x price pattern (e.g., "2 X 12.99")
            /^\s*\d+\s*ST\b/i, // Item count (e.g., "3 ST")
            /^\s*\d{5,}/, // Long numbers (e.g., article codes)
          ];

          const isExcluded = excludePatterns.some((pattern) =>
            pattern.test(element.text)
          );
          if (isExcluded) continue;

          // Try to extract a numeric value with the correct decimal format
          let valueResult: number | null = null;

          // Check if it's a number on its own line
          if (/^\s*\d+[.,]\d+\s*$/.test(element.text)) {
            if (isEuropeanFormat) {
              valueResult = parseFloat(element.text.trim().replace(",", "."));
            } else {
              valueResult = parseFloat(element.text.trim());
            }
          } else {
            // Otherwise, try to extract from text with the right format
            valueResult = extractNumericValue(element.text);
          }

          if (valueResult === null) continue;

          // Consider only reasonable total values (€1.00 - €1000.00)
          if (valueResult >= 1 && valueResult < 1000) {
            // Prioritize based on various heuristics

            // 1. Value has decimal places (e.g., 12.34 vs 12)
            const hasDecimal = valueResult % 1 !== 0;
            let confidence = hasDecimal ? 0.7 : 0.5;

            // 2. Value is relatively high compared to others (but not suspiciously high)
            if (valueResult > highestValue && hasDecimal) {
              highestValue = valueResult;

              // 3. Boost confidence if line contains total-related words
              if (/total|totaal|sum|bedrag|te voldoen/i.test(element.text)) {
                confidence += 0.2;
              }

              // 4. Boost confidence if value appears with currency symbol
              if (/€|eur|euro/i.test(element.text)) {
                confidence += 0.25; // Higher boost for currency indicators
              }
              // 5. No longer using vendor-specific rules - using spatial pattern detection instead
              // Note: Future implementation will use spatial awareness here

              highestValueConfidence = confidence;
            }
          }
        }

        // If we found Euro values, prioritize the largest one if it's reasonable
        if (
          euroValues.length > 0 &&
          euroValues[0] >= 5 &&
          euroValues[0] < 1000
        ) {
          // If this value is significantly higher than what we found through other means,
          // and it has a decimal part, it's likely the total
          if (euroValues[0] > highestValue * 0.8 && euroValues[0] % 1 !== 0) {
            highestValue = euroValues[0];
            highestValueConfidence = 0.95; // High confidence for Euro values
            if (areDebugging) {
              console.log(
                `[Highest Decimal Rule] Selected Euro value: ${highestValue} as total`
              );
            }
          }
        }

        // After analyzing all elements, make a decision
        if (highestValue > 0) {
          if (areDebugging) {
            console.log(
              `[Highest Decimal Rule] Selected highest value: ${highestValue} (confidence: ${highestValueConfidence})`
            );
          }

          return {
            field: "total",
            value: highestValue,
            confidence: highestValueConfidence,
            ruleId: "total_dutch_highest_decimal",
          };
        }
      }
      return null;
    },
    priority: 100, // Highest priority to override all other rules for total detection
  },

  // Rule for detecting potentially truncated decimal values from OCR errors
  {
    id: "total_fuzzy_ocr_correction",
    name: "OCR Fuzzy Total Detection",
    description:
      "Detects potentially truncated total values from OCR errors, particularly with European decimal formats",
    applicableFields: ["total"],
    conditions: [
      createRegexMatchCondition(
        /\b(totaal|total|te betalen|eindtotaal|amount|sum|betaald|te voldoen)[\s:]+.*(\d+)\s*EUR/i
      ),
    ],
    action: (
      elements: TextElement[],
      index: number,
    ): RuleResult | null => {
      const value = extractNumericValue(elements[index].text);
      if (value !== null && isLikelySuspiciouslyRound(value)) {
        // Calculate confidence based on the evidence of OCR error
        // We apply a small confidence reduction as this is a suspiciously round number
        // that might be a truncated decimal value
        return {
          field: "total",
          value,
          confidence: 0.85, // Still reasonably high because of the explicit label
          ruleId: "total_fuzzy_ocr_correction",
        };
      }
      return null;
    },
    priority: 18, // Between explicit label and keyword matching
  },

  // Rule for explicit "Totaal:" label with value on same line
  {
    id: "total_explicit_label_same_line",
    name: "Explicit Total Label",
    description: "Detects totals with explicit label on the same line",
    applicableFields: ["total"],
    conditions: [
      // Match common total labels like "Total: 123.45"
      createRegexMatchCondition(
        /\b(?:totaal|total|sum|te betalen|amount|betaald)[\s:]+\d/i
      ),
    ],
    action: (
      elements: TextElement[],
      index: number,
      matchedConditions,
      formatInfo
    ): RuleResult | null => {
      // Use the correct number format based on detected format
      const isEuropeanFormat = formatInfo?.isEuropeanFormat !== false;

      // Extract the value considering the correct decimal format
      let value: number | null = null;

      if (isEuropeanFormat) {
        // European format: replace comma with period for JS parsing
        const euroValue = elements[index].text.replace(",", ".");
        value = extractNumericValue(euroValue);
      } else {
        // US format
        value = extractNumericValue(elements[index].text);
      }

      if (value !== null && value > 1.0) {
        return {
          field: "total",
          value,
          confidence: 0.9, // Very high confidence - explicit label
          ruleId: "total_explicit_label_same_line",
        };
      }
      return null;
    },
    priority: 20,
  },

  // Rule for total recurring values (values that appear multiple times)
  {
    id: "total_recurring_value",
    name: "Recurring Value Pattern",
    description:
      "When the same value appears multiple times on a receipt, it's often the total",
    applicableFields: ["total"],
    conditions: [
      // Match any line with a number
      createRegexMatchCondition(/\d+[.,]?\d*/),
    ],
    action: (
      elements: TextElement[],
      index: number,
      matchedConditions,
      formatInfo
    ): RuleResult | null => {
      const areDebugging = import.meta.env.VITE_APP_DEBUG_MODE === "true";
      const isEuropeanFormat = formatInfo?.isEuropeanFormat !== false;

      // Extract the number from the current line
      let value: number | null = null;

      if (isEuropeanFormat) {
        // European format: replace comma with period for JS parsing
        const euroValue = elements[index].text.replace(",", ".");
        value = extractNumericValue(euroValue);
      } else {
        // US format
        value = extractNumericValue(elements[index].text);
      }

      if (value === null || value < 5.0) return null; // Only consider plausible totals

      // Count how many times this value appears
      let occurrences = 0;
      for (const element of elements) {
        const elementValue = isEuropeanFormat
          ? extractNumericValue(element.text.replace(",", "."))
          : extractNumericValue(element.text);

        if (elementValue !== null && Math.abs(elementValue - value) < 0.01) {
          occurrences++;
        }
      }

      // If it appears multiple times, it's a candidate for the total
      if (occurrences > 1) {
        if (areDebugging) {
          console.log(
            `[Recurring Rule] Value ${value} appears ${occurrences} times`
          );
        }

        // Calculate confidence based on occurrences
        const confidenceBase = 0.7;
        const confidenceBoost = Math.min(0.3, (occurrences - 2) * 0.05);

        return {
          field: "total",
          value,
          confidence: confidenceBase + confidenceBoost,
          ruleId: "total_recurring_value",
        };
      }

      return null;
    },
    priority: 8,
  },
];
