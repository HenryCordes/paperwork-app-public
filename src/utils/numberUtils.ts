/**
 * Utility functions for handling numbers in receipt parsing
 * Focused on dealing with international number formats, especially Dutch
 */

/**
 * Determines the most likely decimal separator used in a string
 * For Dutch receipts, this is typically a comma (,)
 * For English/US receipts, this is typically a period (.)
 */
export function detectDecimalSeparator(text: string): "," | "." | null {
  if (!text) return null;

  // Count occurrences of each potential separator
  const commaCount = (text.match(/,/g) || []).length;
  const periodCount = (text.match(/\./g) || []).length;

  // Check for common patterns in Dutch numbers
  const dutchPattern = /\d+,\d+/; // e.g., 123,45
  const englishPattern = /\d+\.\d+/; // e.g., 123.45

  const hasDutchPattern = dutchPattern.test(text);
  const hasEnglishPattern = englishPattern.test(text);

  // Make a decision based on the patterns found
  if (hasDutchPattern && !hasEnglishPattern) {
    return ",";
  }

  if (hasEnglishPattern && !hasDutchPattern) {
    return ".";
  }

  // If both patterns exist or neither exists, use count as a fallback
  if (commaCount > periodCount) {
    return ",";
  } else if (periodCount > commaCount) {
    return ".";
  }

  // Default to Dutch format for the app's primary audience
  return ",";
}

/**
 * Converts a string representation of a number from various formats to a standard JavaScript number
 * Handles both Dutch (comma as decimal) and English (period as decimal) formats
 *
 * @param value The string to parse
 * @param preferDutchFormat Whether to prioritize Dutch number format (default: true)
 * @param detectedSeparator Optional pre-detected decimal separator to use
 * @returns Parsed number or null if parsing fails
 */
export function parseNumberFromString(
  value: string,
  preferDutchFormat: boolean = true,
  detectedSeparator?: "," | "." | null
): number | null {
  if (!value || typeof value !== "string") return null;

  // Clean the string - remove currency symbols, extra spaces
  let cleanValue = value.replace(/[€$£]/g, "").trim();

  // Determine the decimal separator if not provided
  const decimalSeparator = detectedSeparator || (preferDutchFormat ? "," : ".");

  // Try parsing based on the determined format
  if (decimalSeparator === ",") {
    // Dutch format: 1.234,56 (periods for thousands, comma for decimal)
    // First, check if there are thousand separators
    const hasPeriodSeparators = /\d{1,3}\.\d{3}/.test(cleanValue);

    // Remove thousand separators if present
    if (hasPeriodSeparators) {
      cleanValue = cleanValue.replace(/\./g, "");
    }

    // Replace decimal comma with period for JavaScript parsing
    const dutchNormalized = cleanValue.replace(",", ".");
    const dutchNumber = parseFloat(dutchNormalized);

    if (!isNaN(dutchNumber)) {
      return dutchNumber;
    }
  } else {
    // English format: 1,234.56 (commas for thousands, period for decimal)
    // Remove thousand separators (commas)
    const englishNormalized = cleanValue.replace(/,/g, "");
    const englishNumber = parseFloat(englishNormalized);

    if (!isNaN(englishNumber)) {
      return englishNumber;
    }
  }

  // Fallback: try the opposite format if the preferred format failed
  if (preferDutchFormat) {
    // Try English format as fallback
    const englishFallback = cleanValue.replace(/,/g, "");
    const englishNumber = parseFloat(englishFallback);
    return !isNaN(englishNumber) ? englishNumber : null;
  } else {
    // Try Dutch format as fallback
    const dutchFallback = cleanValue.replace(/\./g, "").replace(",", ".");
    const dutchNumber = parseFloat(dutchFallback);
    return !isNaN(dutchNumber) ? dutchNumber : null;
  }
}

/**
 * Analyzes text to determine if it's likely using Dutch number format
 * This is useful for detecting the locale of a receipt
 *
 * @param text Text to analyze
 * @returns Probability that the text uses Dutch number format (0-1)
 */
export function isDutchNumberFormatProbability(text: string): number {
  if (!text) return 0.5; // Default to neutral if no text

  let dutchEvidence = 0;
  let englishEvidence = 0;

  // Check for Dutch currency indicators
  if (text.includes("EUR") || text.includes("€")) {
    dutchEvidence += 0.3;
  }

  // Check for Dutch words
  const dutchWords = ["totaal", "btw", "bedrag", "prijs", "korting", "betaald"];
  for (const word of dutchWords) {
    if (text.toLowerCase().includes(word)) {
      dutchEvidence += 0.5;
      break; // Only count once
    }
  }

  // Check for number formats
  const dutchNumberPattern = /\d+,\d+/g;
  const englishNumberPattern = /\d+\.\d+/g;

  const dutchMatches = text.match(dutchNumberPattern) || [];
  const englishMatches = text.match(englishNumberPattern) || [];

  if (dutchMatches.length > englishMatches.length) {
    dutchEvidence += 0.7;
  } else if (englishMatches.length > dutchMatches.length) {
    englishEvidence += 0.7;
  }

  // Calculate probability (0-1 scale)
  const totalEvidence = Math.max(0.1, dutchEvidence + englishEvidence); // Avoid division by zero
  return Math.min(1, Math.max(0, dutchEvidence / totalEvidence));
}

/**
 * Formats a number as currency based on locale
 *
 * @param value Number to format
 * @param locale Locale to use for formatting
 * @param currency Currency code
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  locale: string = "nl-NL",
  currency: string = "EUR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(value);
}

/**
 * Extracts a numeric value from text, handling different number formats
 * This is an enhanced version that handles OCR errors and different decimal separators
 *
 * @param text Text to extract number from
 * @returns Extracted number or null if not found
 */
export function extractNumericValue(text: string): number | null {
  if (!text) return null;

  // Detect if this is likely Dutch format
  const dutchProbability = isDutchNumberFormatProbability(text);
  const preferDutchFormat = dutchProbability > 0.5;

  // Try to extract using regular expressions
  // Look for patterns with currency symbols and specific format patterns

  // Special case for exact €X.YY or €X,YY formats which are very common on receipts
  const exactDecimalCurrencyPattern = /€\s*(\d+[.,]\d{2})\b/;
  const exactMatch = text.match(exactDecimalCurrencyPattern);
  if (exactMatch && exactMatch[1]) {
    // Replace comma with period to make parseFloat work
    const normalized = exactMatch[1].replace(",", ".");
    const value = parseFloat(normalized);
    if (!isNaN(value)) {
      return value;
    }
  }

  // Standard currency patterns
  const currencyPatterns = [
    // Dutch patterns (comma as decimal)
    /€\s*(\d+(?:\.\d{3})*(?:,\d+)?)/, // €12.345,67 or €12,34
    /(\d+(?:\.\d{3})*(?:,\d+)?)\s*€/, // 12.345,67€ or 12,34€

    // English patterns (period as decimal)
    /€\s*(\d+(?:,\d{3})*(?:\.\d+)?)/, // €12,345.67 or €12.34
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*€/, // 12,345.67€ or 12.34€

    // EUR currency code patterns
    /(\d+(?:[.,]\d+)?)\s*EUR/i, // 12.34 EUR or 12,34 EUR
    /EUR\s*(\d+(?:[.,]\d+)?)/i, // EUR 12.34 or EUR 12,34
  ];

  for (const pattern of currencyPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = parseNumberFromString(match[1], preferDutchFormat);
      if (value !== null) {
        return value;
      }
    }
  }

  // If no match with currency, try to find any number
  const numberPattern = /(\d+[.,]\d+)/;
  const match = text.match(numberPattern);
  if (match && match[1]) {
    // Handle the decimal separator directly here
    const numStr = match[1].replace(",", ".");
    return parseFloat(numStr);
  }

  // Last resort, try to find integer values
  const integerPattern = /\b(\d+)\b/;
  const intMatch = text.match(integerPattern);
  if (intMatch && intMatch[1]) {
    return parseInt(intMatch[1], 10);
  }

  return null;
}

/**
 * Checks if a number is suspiciously round (likely missing decimal places due to OCR error)
 *
 * @param value Number to check
 * @returns True if the number is suspiciously round
 */
export function isLikelySuspiciouslyRound(value: number): boolean {
  // Numbers that are exactly integers and above a certain threshold are suspicious
  return value >= 5 && value === Math.floor(value);
}
