import { TextElement, ReceiptInfo } from './types';
import { preprocessText } from './preprocessing';
import { extractDateInfo } from './dateDetection';
import { detectTotalAmount } from './totalDetection';
import { detectTaxValues } from './taxDetection';
import { extractReceiptInfoWithRules } from './rules';

export * from './types';
export * from './rules';

/**
 * Extract receipt information using the legacy approach
 * @param elements Text elements from the receipt OCR
 * @returns Extracted receipt information
 */
export const extractReceiptInfoLegacy = (elements: TextElement[]): ReceiptInfo => {
  console.log("Extracting receipt info (legacy approach) from:", elements.map(e => e.text).join(", "));
  
  // Initialize receipt info with default values
  const receiptInfo: ReceiptInfo = {
    date: new Date(),
    total: 0,
    taxLow: 0,
    taxHigh: 0
  };

  // Step 1: Preprocess text elements
  const { cleanedElements, normalizedElements, numbers } = preprocessText(elements);
  
  // Step 2: Extract date
  const detectedDate = extractDateInfo(cleanedElements, normalizedElements);
  if (detectedDate) {
    receiptInfo.date = detectedDate;
  }
  
  // Step 3: Detect total amounts
  const potentialTotals = detectTotalAmount(cleanedElements, numbers);
  
  // Select the total with highest confidence
  if (potentialTotals.length > 0) {
    potentialTotals.sort((a, b) => b.confidence - a.confidence);
    receiptInfo.total = potentialTotals[0].value;
  }
  
  // Step 4: Detect tax values
  const { lowTax, highTax } = detectTaxValues(
    cleanedElements, 
    normalizedElements, 
    numbers,
    receiptInfo.total
  );
  
  // Select tax values with highest confidence
  if (lowTax.length > 0) {
    lowTax.sort((a, b) => b.confidence - a.confidence);
    receiptInfo.taxLow = lowTax[0].value;
    console.log("==BON== Selected BTW LAAG value:", receiptInfo.taxLow, "with confidence:", lowTax[0].confidence);
  }
  
  if (highTax.length > 0) {
    highTax.sort((a, b) => b.confidence - a.confidence);
    receiptInfo.taxHigh = highTax[0].value;
    console.log("==BON== Selected BTW HOOG value:", receiptInfo.taxHigh, "with confidence:", highTax[0].confidence);
  }
  
  console.log("==BON== Final receipt info (legacy):", JSON.stringify(receiptInfo, null, 2));
  
  return receiptInfo;
};

/**
 * Extract receipt information using the best available approach
 * Currently defaults to the rule-based engine, but can be configured to use legacy approach
 * @param elements Text elements from the receipt OCR
 * @param useRuleEngine Whether to use the rule-based engine (default: true)
 * @param debugMode Enable debug output for rule matching (default: false)
 * @returns Extracted receipt information
 */
export const extractReceiptInfo = (
  elements: TextElement[], 
  useRuleEngine = true,
  debugMode = false
): ReceiptInfo => {
  if (useRuleEngine) {
    // Use the rule-based engine for extraction
    return extractReceiptInfoWithRules(elements, debugMode);
  } else {
    // Use the legacy approach
    return extractReceiptInfoLegacy(elements);
  }
};
