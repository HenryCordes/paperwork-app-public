import { ReceiptRuleEngine } from "./ruleEngine";
import { dateRules } from "./dateRules";
import { totalRules } from "./totalRules";
import { taxRules } from "./taxRules";
import { TextElement, ReceiptInfo } from "../types";
import { preprocessText } from "../preprocessing";

// Export all types and implementations
export * from "./types";
export * from "./ruleEngine";
export * from "./conditionFactory";

// Export rule collections
export { dateRules } from "./dateRules";
export { totalRules } from "./totalRules";
export { taxRules } from "./taxRules";

/**
 * Creates and configures a receipt rule engine with all standard rules
 * @param debugMode Enable debug output for rule matching
 * @returns Configured ReceiptRuleEngine instance
 */
export const createReceiptRuleEngine = (
  debugMode = false
): ReceiptRuleEngine => {
  const engine = new ReceiptRuleEngine([], debugMode);

  // Add all rule collections
  engine.addRules([...dateRules, ...totalRules, ...taxRules]);

  return engine;
};

/**
 * Extract receipt information using the rule-based engine
 * @param elements Text elements from the receipt OCR
 * @param debugMode Enable debug output for rule matching
 * @returns Extracted receipt information
 */
export const extractReceiptInfoWithRules = (
  elements: TextElement[],
  debugMode = false
): ReceiptInfo => {
  if (debugMode) {
    console.log(
      "Extracting receipt info using rule engine from:",
      elements.map((e) => e.text).join(", ")
    );
  }

  // Step 1: Preprocess text elements and detect number format
  const {
    cleanedElements,
    isEuropeanFormat,
    decimalSeparator,
  } = preprocessText(elements);

  if (debugMode) {
    console.log(
      `[Receipt Format] Detected format: ${
        isEuropeanFormat ? "European" : "US"
      }, decimal separator: ${decimalSeparator}`
    );
  }

  // Create and configure rule engine
  const engine = createReceiptRuleEngine(debugMode);

  // Pass number format information to the engine
  engine.setFormatInfo({
    isEuropeanFormat,
    decimalSeparator,
  });

  // Create TextElement objects from cleaned text for rule processing
  const cleanedTextElements: TextElement[] = cleanedElements.map(
    (text, index) => {
      // Get the original element to copy coordinates
      const originalElement = elements[index < elements.length ? index : 0];
      // Return a new object with the cleaned text and original coordinates
      return {
        text,
        topLeft: originalElement.topLeft,
        topRight: originalElement.topRight,
        bottomLeft: originalElement.bottomLeft,
        bottomRight: originalElement.bottomRight,
        // Add metadata about the detected number format
        metadata: {
          isEuropeanFormat,
          decimalSeparator,
        },
      };
    }
  );

  // Extract receipt info
  const receiptInfo = engine.extract(cleanedTextElements);

  if (debugMode) {
    console.log(
      "==BON== Final receipt info (rule engine):",
      JSON.stringify(receiptInfo, null, 2)
    );
  }

  return receiptInfo;
};
