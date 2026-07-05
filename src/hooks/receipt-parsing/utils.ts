import { TextElement } from './types';

// Text processing utilities
export const cleanText = (text: string): string => {
  return text.replace(/\s+/g, ' ').trim();
};

export const isNumeric = (str: string): boolean => {
  // Check if a string represents a numeric value (including with comma as decimal separator)
  const numRegex = /^-?\d+([,.]\d+)?$/;
  return numRegex.test(str.trim());
};

export const parseDate = (dateStr: string): Date | null => {
  // Try to parse a date from various formats
  try {
    // Try native date parsing first
    const possibleDate = new Date(dateStr);
    if (!isNaN(possibleDate.getTime())) {
      return possibleDate;
    }

    // Handle "DD Month 'YY" format (e.g., "18 May '25")
    const shortYearMonthPattern = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+'(\d{2})/i;
    const shortYearMatch = dateStr.match(shortYearMonthPattern);
    if (shortYearMatch) {
      const day = parseInt(shortYearMatch[1]);
      const monthStr = shortYearMatch[2].toLowerCase();
      const year = parseInt(shortYearMatch[3]) + 2000; // Assuming '25 means 2025
      
      const monthMap: Record<string, number> = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      
      const month = monthMap[monthStr.toLowerCase().substring(0, 3)];
      if (month !== undefined && day >= 1 && day <= 31) {
        const result = new Date(year, month, day);
        if (!isNaN(result.getTime())) {
          console.log(`==BON== Parsed date from format 'DD Month 'YY': ${result.toISOString()}`);
          return result;
        }
      }
    }
    
    // Handle "DD-MM-YYYY" format manually
    const dashPattern = /(\d{1,2})-(\d{1,2})-(\d{4})/;
    const dashMatch = dateStr.match(dashPattern);
    if (dashMatch) {
      const day = parseInt(dashMatch[1]);
      const month = parseInt(dashMatch[2]) - 1; // JS months are 0-indexed
      const year = parseInt(dashMatch[3]);
      
      const result = new Date(year, month, day);
      if (!isNaN(result.getTime())) {
        return result;
      }
    }
    
    return null;
  } catch (e) {
    console.error('==BON== Error parsing date:', e);
    return null;
  }
};

export const isDateTime = (str: string): boolean => {
  // Check if string likely contains a date
  // Simple heuristic looking for patterns like dd-mm-yyyy, yyyy-mm-dd
  const dateRegex = /\d{1,4}[-./]\d{1,2}[-./]\d{1,4}/;
  return dateRegex.test(str);
};

// Numerical processing utilities
export const calculateTaxFromInclusiveAmount = (total: number, percentage: number): number => {
  // Calculate tax amount when the total already includes tax
  // Formula: tax = total - (total / (1 + percentage/100))
  return total - (total / (1 + percentage / 100));
};

export const findApproximatePercentage = (
  numbers: number[], 
  total: number, 
  percentage: number
): number | null => {
  // Find a value in the array that's approximately [percentage]% of the total
  if (numbers.length === 0 || total <= 0) return null;
  
  const target = calculateTaxFromInclusiveAmount(total, percentage);
  const tolerance = target * 0.2; // 20% tolerance

  for (const num of numbers) {
    if (Math.abs(num - target) <= tolerance) {
      return num;
    }
  }
  
  return null;
};

// Spatial analysis utilities
export const findHorizontalAlignedElements = (
  elements: TextElement[],
  referenceElement: TextElement
): TextElement[] => {
  if (!referenceElement.topLeft || !referenceElement.bottomLeft) {
    return [];
  }

  const refTop = referenceElement.topLeft[1];
  const refBottom = referenceElement.bottomLeft[1];
  
  return elements.filter(element => {
    if (!element.topLeft || !element.bottomLeft) return false;
    
    const elementTop = element.topLeft[1];
    const elementBottom = element.bottomLeft[1];
    
    // Check if there's significant vertical overlap
    const overlap = Math.min(refBottom, elementBottom) - Math.max(refTop, elementTop);
    const minHeight = Math.min(refBottom - refTop, elementBottom - elementTop);
    
    return overlap > 0.5 * minHeight;
  });
};

export const findElementToRight = (
  elements: TextElement[],
  referenceElement: TextElement
): TextElement | null => {
  if (!referenceElement.topRight) return null;
  
  const refRight = referenceElement.topRight[0];
  
  let closestElement: TextElement | null = null;
  let minDistance = Infinity;
  
  elements.forEach(element => {
    if (!element.topLeft || element === referenceElement) return;
    
    const elementLeft = element.topLeft[0];
    
    if (elementLeft > refRight) {
      const distance = elementLeft - refRight;
      if (distance < minDistance) {
        minDistance = distance;
        closestElement = element;
      }
    }
  });
  
  return closestElement;
};
