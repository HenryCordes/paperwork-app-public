import { extractDateInfo } from '../../../hooks/receipt-parsing/dateDetection';
import { TextElement } from '../../../hooks/receipt-parsing/types';
import { parseDate } from '../../../hooks/receipt-parsing/utils';

describe('Date Detection', () => {
  // Test for explicitly supported date patterns
  test('should extract date from US date format (MM/DD/YYYY)', () => {
    // Mock TextElement array with date in US format
    const mockElements: TextElement[] = [
      { text: 'Welcome to Store', topLeft: [10, 10], topRight: [200, 10], bottomLeft: [10, 30], bottomRight: [200, 30] },
      { text: '05/18/2024', topLeft: [10, 40], topRight: [100, 40], bottomLeft: [10, 60], bottomRight: [100, 60] },
      { text: 'SUBTOTAL', topLeft: [10, 70], topRight: [100, 70], bottomLeft: [10, 90], bottomRight: [100, 90] }
    ];

    // Create cleaned text elements for testing
    const cleanedElements = mockElements.map(el => el.text);
    
    // First verify the date parsing function works with this format
    const testDate = parseDate('05/18/2024');
    expect(testDate).not.toBeNull();
    
    // Call the function to test
    const result = extractDateInfo(cleanedElements, mockElements);
    
    // Expected values
    expect(result).not.toBeNull();
    if (result) {
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(4); // 0-indexed, so 4 is May
      expect(result.getDate()).toBe(18);
    }
  });

  // Test for date detection with spatial analysis
  test('should extract date from spatial analysis near date keyword', () => {
    // Mock TextElement array with date keyword and a date value to its right
    const mockElements: TextElement[] = [
      { text: 'Welcome to Store', topLeft: [10, 10], topRight: [200, 10], bottomLeft: [10, 30], bottomRight: [200, 30] },
      { text: 'Date:', topLeft: [10, 40], topRight: [60, 40], bottomLeft: [10, 60], bottomRight: [60, 60] },
      { text: '05/18/2024', topLeft: [70, 40], topRight: [150, 40], bottomLeft: [70, 60], bottomRight: [150, 60] },
      { text: 'SUBTOTAL', topLeft: [10, 70], topRight: [100, 70], bottomLeft: [10, 90], bottomRight: [100, 90] }
    ];

    // Create cleaned text elements for testing
    const cleanedElements = mockElements.map(el => el.text);
    
    // Call the function to test
    const result = extractDateInfo(cleanedElements, mockElements);
    
    // Expected values
    expect(result).not.toBeNull();
    if (result) {
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(4); // 0-indexed, so 4 is May
      expect(result.getDate()).toBe(18);
    }
  });

  // Test for ISO date format
  test('should extract date from ISO format (YYYY-MM-DD)', () => {
    // Mock TextElement array with ISO date format
    const mockElements: TextElement[] = [
      { text: 'Welkom', topLeft: [10, 10], topRight: [200, 10], bottomLeft: [10, 30], bottomRight: [200, 30] },
      { text: 'Datum:', topLeft: [10, 40], topRight: [60, 40], bottomLeft: [10, 60], bottomRight: [60, 60] },
      { text: '2024-05-18', topLeft: [70, 40], topRight: [150, 40], bottomLeft: [70, 60], bottomRight: [150, 60] },
      { text: 'SUBTOTAAL', topLeft: [10, 70], topRight: [100, 70], bottomLeft: [10, 90], bottomRight: [100, 90] }
    ];

    // Create cleaned text elements for testing
    const cleanedElements = mockElements.map(el => el.text);
    
    // First verify the date parsing function works with this format
    const testDate = parseDate('2024-05-18');
    expect(testDate).not.toBeNull();
    
    // Call the function to test
    const result = extractDateInfo(cleanedElements, mockElements);
    
    // Expected values
    expect(result).not.toBeNull();
    if (result) {
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(4); // 0-indexed, so 4 is May
      expect(result.getDate()).toBe(18);
    }
  });

  // Test with multiple date formats - should pick the most recent
  test('should pick the most recent date when multiple dates are found', () => {
    // Mock TextElement array with multiple dates in ISO format (which parseDate handles correctly)
    const mockElements: TextElement[] = [
      { text: 'Printed: 2024-05-15', topLeft: [10, 10], topRight: [200, 10], bottomLeft: [10, 30], bottomRight: [200, 30] },
      { text: 'Order Date: 2024-05-10', topLeft: [10, 40], topRight: [200, 40], bottomLeft: [10, 60], bottomRight: [200, 60] },
      { text: 'Delivery Date: 2024-10-18', topLeft: [10, 70], topRight: [200, 70], bottomLeft: [10, 90], bottomRight: [200, 90] },
      { text: 'SUBTOTAL', topLeft: [10, 100], topRight: [100, 100], bottomLeft: [10, 120], bottomRight: [100, 120] }
    ];

    // Create cleaned text elements for testing
    const cleanedElements = mockElements.map(el => el.text);
    
    // Verify all test dates parse correctly
    expect(parseDate('2024-05-15')).not.toBeNull();
    expect(parseDate('2024-05-10')).not.toBeNull();
    expect(parseDate('2024-10-18')).not.toBeNull();
    
    // Call the function to test
    const result = extractDateInfo(cleanedElements, mockElements);
    
    // Expected values - should pick the most recent date (2024-10-18)
    expect(result).not.toBeNull();
    if (result) {
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(9); // 0-indexed, so 9 is October
      expect(result.getDate()).toBe(18);
    }
  });

  // Test for no date in receipt
  test('should return null when no date is found', () => {
    // Mock TextElement array with no dates
    const mockElements: TextElement[] = [
      { text: 'Welcome to Store', topLeft: [10, 10], topRight: [200, 10], bottomLeft: [10, 30], bottomRight: [200, 30] },
      { text: 'SUBTOTAL', topLeft: [10, 40], topRight: [100, 40], bottomLeft: [10, 60], bottomRight: [100, 60] },
      { text: '25.00', topLeft: [150, 40], topRight: [200, 40], bottomLeft: [150, 60], bottomRight: [200, 60] }
    ];

    // Create cleaned text elements for testing
    const cleanedElements = mockElements.map(el => el.text);
    
    // Call the function to test
    const result = extractDateInfo(cleanedElements, mockElements);
    
    // Expected value
    expect(result).toBeNull();
  });
});
