import { TextElement } from './types';
import { isNumeric, calculateTaxFromInclusiveAmount, findApproximatePercentage } from './utils';

export interface TaxCandidate {
  value: number;
  confidence: number;
}

export const detectTaxValues = (
  cleanedElements: string[], 
  normalizedElements: TextElement[], 
  numbers: number[],
  total: number
): { lowTax: TaxCandidate[], highTax: TaxCandidate[] } => {
  // Initialize return values
  const lowTaxCandidates: TaxCandidate[] = [];
  const highTaxCandidates: TaxCandidate[] = [];
  
  // Track tax percentages
  let taxPercentageLow: number | null = null;
  let taxPercentageHigh: number | null = null;
  
  // First scan for tax percentages
  for (let i = 0; i < cleanedElements.length; i++) {
    const element = cleanedElements[i].toLowerCase();
    
    // Look for tax percentage information
    if (element.includes('9%') || element.includes('9,00%') || element.includes('9.00%')) {
      taxPercentageLow = 9;
    }
    if (element.includes('21%') || element.includes('21,00%') || element.includes('21.00%')) {
      taxPercentageHigh = 21;
    }
    
    // Handle Burger King format: "1.83 BTW 9%" - combined tax amount and percentage
    const combinedPattern = /(\d+[,.]\d+)\s*btw\s*(\d+)%/i;
    const combinedMatch = element.match(combinedPattern);
    if (combinedMatch) {
      const taxValue = parseFloat(combinedMatch[1].replace(',', '.'));
      const taxPercent = parseInt(combinedMatch[2]);
      
      console.log(`==BON== Found combined tax format: ${taxValue} BTW ${taxPercent}%`);
      
      // Add the tax value with high confidence
      if (taxPercent === 9 || taxPercent === 6) {
        taxPercentageLow = taxPercent;
        lowTaxCandidates.push({ value: taxValue, confidence: 0.99 });
      } else if (taxPercent === 21) {
        taxPercentageHigh = taxPercent;
        highTaxCandidates.push({ value: taxValue, confidence: 0.99 });
      }
    }
  }

  // 1. Look for specific patterns that indicate tax values on Dutch receipts
  // Pattern: "EX BTW LAAG" followed by a larger number, then "BTW LAAG" followed by a smaller number
  for (let i = 0; i < cleanedElements.length - 4; i++) {
    const text1 = cleanedElements[i].toLowerCase();
    const text2 = cleanedElements[i+1].toLowerCase();
    const val1 = isNumeric(cleanedElements[i+2]) ? parseFloat(cleanedElements[i+2].replace(',', '.')) : null;
    const val2 = isNumeric(cleanedElements[i+3]) ? parseFloat(cleanedElements[i+3].replace(',', '.')) : null;
    
    // Look for the exact sequence pattern of tax values
    if (text1.includes('ex') && text1.includes('btw') && text1.includes('laag') &&
        text2.includes('btw') && text2.includes('laag') && !text2.includes('ex') &&
        val1 !== null && val2 !== null) {
      
      // The smaller value is almost always the tax amount (BTW LAAG)
      const smallerValue = Math.min(val1, val2);
      console.log("==BON== Found exact BTW LAAG pattern, tax value is: " + smallerValue);
      
      // High confidence for this specific pattern
      lowTaxCandidates.push({ value: smallerValue, confidence: 0.99 });
    }
  }
  
  // 2. Look for just "BTW LAAG" (without "EX") followed immediately by a number
  for (let i = 0; i < cleanedElements.length - 1; i++) {
    const text = cleanedElements[i].toLowerCase();
    
    // Handle different BTW formats
    
    // Format: "BTW LAAG" followed by a number
    if (text.includes('btw') && text.includes('laag') && !text.includes('ex')) {
      // Check if next element is numeric
      if (i+1 < cleanedElements.length && isNumeric(cleanedElements[i+1])) {
        const value = parseFloat(cleanedElements[i+1].replace(',', '.'));
        console.log("==BON== Found BTW LAAG + number pattern, tax value: " + value);
        
        // Medium confidence for this pattern
        lowTaxCandidates.push({ value, confidence: 0.9 });
      }
      
      // Also check for a number in the same element (some OCR results combine them)
      const numericMatch = text.match(/(\d+[,.]\d+)/);
      if (numericMatch) {
        const value = parseFloat(numericMatch[1].replace(',', '.'));
        console.log("==BON== Found BTW LAAG with embedded number: " + value);
        lowTaxCandidates.push({ value, confidence: 0.88 });
      }
    }
    
    // Look for BTW HOOG pattern
    if (text.includes('btw') && 
        (text.includes('hoog') || text.includes('high') || text.includes('21%')) && 
        !text.includes('ex')) {
      
      // Check if next element is numeric
      if (i+1 < cleanedElements.length && isNumeric(cleanedElements[i+1])) {
        const value = parseFloat(cleanedElements[i+1].replace(',', '.'));
        console.log("==BON== Found BTW HOOG + number pattern, tax value: " + value);
        
        // Medium confidence for this pattern
        highTaxCandidates.push({ value, confidence: 0.9 });
      }
      
      // Also check for a number in the same element
      const numericMatch = text.match(/(\d+[,.]\d+)/);
      if (numericMatch) {
        const value = parseFloat(numericMatch[1].replace(',', '.'));
        console.log("==BON== Found BTW HOOG with embedded number: " + value);
        highTaxCandidates.push({ value, confidence: 0.88 });
      }
    }
  }
  
  // 3. Check tax percentages and calculate based on total if available
  if (taxPercentageLow !== null && total > 0) {
    const calculatedTax = calculateTaxFromInclusiveAmount(total, taxPercentageLow);
    console.log("==BON== Calculated BTW LAAG based on percentage: " + calculatedTax);
    
    // Low confidence for calculated values
    lowTaxCandidates.push({ value: calculatedTax, confidence: 0.7 });
  }
  
  if (taxPercentageHigh !== null && total > 0) {
    const calculatedTax = calculateTaxFromInclusiveAmount(total, taxPercentageHigh);
    console.log("==BON== Calculated BTW HOOG based on percentage: " + calculatedTax);
    
    // Low confidence for calculated values
    highTaxCandidates.push({ value: calculatedTax, confidence: 0.7 });
  }
  
  // 4. Try to find tax amounts based on common values (Netherlands: 9% and 21%)
  const found9Percent = findApproximatePercentage(numbers, total, 9);
  if (found9Percent !== null) {
    console.log("==BON== Found approximate BTW LAAG based on 9% rule: " + found9Percent);
    lowTaxCandidates.push({ value: found9Percent, confidence: 0.6 });
  }
  
  const found21Percent = findApproximatePercentage(numbers, total, 21);
  if (found21Percent !== null) {
    console.log("==BON== Found approximate BTW HOOG based on 21% rule: " + found21Percent);
    highTaxCandidates.push({ value: found21Percent, confidence: 0.6 });
  }
  
  // 5. Look for explicit tax values embedded in text (e.g., "1.83 BTW 9%")
  for (let i = 0; i < cleanedElements.length; i++) {
    const element = cleanedElements[i];
    
    // Look for text with both numbers and BTW references
    if (element.toLowerCase().includes('btw')) {
      // Extract all numbers from the text
      const numMatches = element.match(/\d+[,.]\d+/g);
      if (numMatches && numMatches.length > 0) {
        for (const match of numMatches) {
          const value = parseFloat(match.replace(',', '.'));
          
          // Determine if this is likely low or high tax based on context
          if (element.toLowerCase().includes('9%') || element.toLowerCase().includes('laag')) {
            if (!lowTaxCandidates.some(t => Math.abs(t.value - value) < 0.01)) {
              console.log(`==BON== Found tax value ${value} in text with BTW reference: "${element}"`);
              lowTaxCandidates.push({ value, confidence: 0.85 });
            }
          } else if (element.toLowerCase().includes('21%') || element.toLowerCase().includes('hoog')) {
            if (!highTaxCandidates.some(t => Math.abs(t.value - value) < 0.01)) {
              console.log(`==BON== Found tax value ${value} in text with BTW reference: "${element}"`);
              highTaxCandidates.push({ value, confidence: 0.85 });
            }
          }
        }
      }
    }
  }
  
  // Sort candidates by confidence (highest first)
  return {
    lowTax: lowTaxCandidates.sort((a, b) => b.confidence - a.confidence),
    highTax: highTaxCandidates.sort((a, b) => b.confidence - a.confidence)
  };
};
