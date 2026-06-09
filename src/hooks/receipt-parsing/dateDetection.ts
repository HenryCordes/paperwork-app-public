import { TextElement } from './types';
import { isDateTime, parseDate, findHorizontalAlignedElements, findElementToRight } from './utils';

export const extractDateInfo = (cleanedElements: string[], normalizedElements: TextElement[]): Date | null => {
  const dates: Date[] = [];
  
  // Check for date information in text elements
  for (let i = 0; i < cleanedElements.length; i++) {
    const element = cleanedElements[i];
    
    // Check for full date patterns
    if (isDateTime(element)) {
      const parsedDate = parseDate(element);
      if (parsedDate) {
        dates.push(parsedDate);
      }
    }
  }

  // Use spatial analysis to find dates
  if (normalizedElements.some(e => e.topLeft && e.topRight)) {
    const dateKeywords = ['date', 'datum', 'dag'];
    const dateElements = normalizedElements.filter(element => {
      const lowerText = element.text.toLowerCase();
      return dateKeywords.some(keyword => lowerText.includes(keyword));
    });

    // Look for date values near date keywords
    for (const dateElement of dateElements) {
      // Find elements on the same line
      const sameLineElements = findHorizontalAlignedElements(normalizedElements, dateElement);
      // Find element to the right that might contain the date
      const valueElement = findElementToRight(sameLineElements, dateElement);
      
      if (valueElement) {
        const valueText = valueElement.text;
        console.log("==BON== Found potential date value:", valueText);
        
        // Try to parse the date
        const parsedDate = parseDate(valueText);
        if (parsedDate) {
          dates.push(parsedDate);
        }
      }
    }
  }

  // Process dates - use the most recent date if multiple are found
  if (dates.length > 0) {
    return new Date(Math.max(...dates.map(d => d.getTime())));
  }

  return null;
}
