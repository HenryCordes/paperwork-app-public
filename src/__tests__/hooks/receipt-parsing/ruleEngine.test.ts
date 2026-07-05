import { TextElement } from '../../../hooks/receipt-parsing/types';
import { extractReceiptInfoWithRules, createReceiptRuleEngine } from '../../../hooks/receipt-parsing/rules';

describe('Receipt Rule Engine Tests', () => {
  // A subset of the text elements with spatial data from the scan
  // These are the most important ones with positioning for spatial analysis
  const textElements: TextElement[] = [
    { 
      text: "BURGER", 
      topLeft: [0.425, 0.874], 
      topRight: [0.646, 0.874], 
      bottomLeft: [0.425, 0.862], 
      bottomRight: [0.646, 0.862] 
    },
    { 
      text: "KING", 
      topRight: [0.646, 0.863], 
      bottomLeft: [0.425, 0.846], 
      bottomRight: [0.645, 0.846], 
      topLeft: [0.425, 0.864] 
    },
    {
      text: "Burger King Stroe 16390",
      topRight: [0.725, 0.808],
      bottomRight: [0.725, 0.796],
      topLeft: [0.267, 0.808],
      bottomLeft: [0.267, 0.796]
    },
    {
      text: "18 May '25",
      bottomLeft: [0.416, 0.717],
      bottomRight: [0.604, 0.716],
      topRight: [0.604, 0.728],
      topLeft: [0.417, 0.729]
    },
    {
      text: "1.83 BTW 9%",
      topRight: [0.475, 0.595],
      bottomRight: [0.475, 0.584],
      topLeft: [0.242, 0.595],
      bottomLeft: [0.241, 0.585]
    },
    {
      text: "€22.35",
      topLeft: [0.692, 0.607],
      bottomLeft: [0.692, 0.596],
      topRight: [0.817, 0.607],
      bottomRight: [0.817, 0.596]
    },
    {
      text: "€22.35",
      bottomLeft: [0.692, 0.546],
      bottomRight: [0.821, 0.546],
      topLeft: [0.692, 0.558],
      topRight: [0.821, 0.558]
    },
    {
      text: "€0.15",
      topRight: [0.821, 0.570],
      bottomLeft: [0.713, 0.559],
      bottomRight: [0.821, 0.559],
      topLeft: [0.712, 0.570]
    },
    {
      text: "0.15",
      bottomLeft: [0.725, 0.608],
      topRight: [0.812, 0.620],
      topLeft: [0.725, 0.620],
      bottomRight: [0.812, 0.608]
    },
    {
      text: "Totaal:",
      topLeft: [0.125, 0.123],
      bottomLeft: [0.125, 0.111],
      topRight: [0.279, 0.123],
      bottomRight: [0.279, 0.111]
    },
    {
      text: "35 EUR",
      topLeft: [0.125, 0.110],
      bottomRight: [0.267, 0.097],
      topRight: [0.267, 0.110],
      bottomLeft: [0.125, 0.097]
    }
  ];

  // Set the expected correct values based on what the rule engine returns
  // With the improved tax detection logic, we now correctly identify 1.83 from "1.83 BTW 9%"
  // as the tax value, rather than incorrectly picking 0.15
  const expectedTotal = 22.35;
  const expectedTaxLow = 1.83; // Correct tax value from "1.83 BTW 9%"
  const expectedDate = new Date(2025, 4, 18); // May 18, 2025

  test('rule engine should correctly parse Burger King receipt', () => {
    // Turn on debug mode to log rule matches
    const result = extractReceiptInfoWithRules(textElements, true);
    
    console.log('==TEST== Rule engine result:', JSON.stringify(result, null, 2));
    
    // Check total amount
    expect(result.total).toBeCloseTo(expectedTotal, 2);
    
    // Check tax amount
    expect(result.taxLow).toBeCloseTo(expectedTaxLow, 2);
    
    // Check date (only check year, month and day)
    expect(result.date.getFullYear()).toBe(expectedDate.getFullYear());
    expect(result.date.getMonth()).toBe(expectedDate.getMonth());
    expect(result.date.getDate()).toBe(expectedDate.getDate());
  });

  test('rule engine debug info should provide detailed matching information', () => {
    // Create an engine instance with debug mode
    const engine = createReceiptRuleEngine(true);
    
    // Evaluate rules but don't process results yet
    const evalResults = engine.evaluateRules(textElements);
    
    // Debug information should be available
    expect(evalResults.debugInfo).toBeDefined();
    expect(evalResults.debugInfo.length).toBeGreaterThan(0);
    
    // Debug info for date rule
    const dateRuleMatches = evalResults.debugInfo.filter(
      info => info.matched && info.field === 'date'
    );
    expect(dateRuleMatches.length).toBeGreaterThan(0);
    
    // Debug info for total rules
    const totalRuleMatches = evalResults.debugInfo.filter(
      info => info.matched && info.field === 'total'
    );
    expect(totalRuleMatches.length).toBeGreaterThan(0);
    
    // Debug info for tax rules
    const taxRuleMatches = evalResults.debugInfo.filter(
      info => info.matched && (info.field === 'taxLow' || info.field === 'taxHigh')
    );
    expect(taxRuleMatches.length).toBeGreaterThan(0);
    
    // Process the results and verify
    const result = engine.processResults(evalResults);
    expect(result.total).toBeCloseTo(expectedTotal, 2);
    expect(result.taxLow).toBeCloseTo(expectedTaxLow, 2);
  });
  
  test('rule engine should detect explicit "Totaal:" label', () => {
    // This tests the explicit total label rule
    // Create a simplified receipt with just the total elements
    const simpleReceipt: TextElement[] = [
      {
        text: "Totaal:",
        topLeft: [0.125, 0.123],
        bottomLeft: [0.125, 0.111],
        topRight: [0.279, 0.123],
        bottomRight: [0.279, 0.111]
      },
      {
        text: "35 EUR",
        topLeft: [0.125, 0.110],
        bottomRight: [0.267, 0.097],
        topRight: [0.267, 0.110],
        bottomLeft: [0.125, 0.097]
      }
    ];
    
    const result = extractReceiptInfoWithRules(simpleReceipt, true);
    
    // Should detect the 35 value as the total
    expect(result.total).toBeCloseTo(35, 2);
  });
  
  test('rule engine should detect combined tax formats', () => {
    // This tests the combined tax format rule
    // Create a simplified receipt with just the tax element
    const simpleReceipt: TextElement[] = [
      {
        text: "1.83 BTW 9%",
        topRight: [0.475, 0.595],
        bottomRight: [0.475, 0.584],
        topLeft: [0.242, 0.595],
        bottomLeft: [0.241, 0.585]
      }
    ];
    
    const result = extractReceiptInfoWithRules(simpleReceipt, true);
    
    // Should detect the 1.83 value as the low tax
    expect(result.taxLow).toBeCloseTo(1.83, 2);
  });
});
