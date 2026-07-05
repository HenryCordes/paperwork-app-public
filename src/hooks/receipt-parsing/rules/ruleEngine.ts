import { TextElement, ReceiptInfo } from '../types';
import { ReceiptRule, RuleResult, RuleContext } from './types';

/**
 * Interface for receipt number format information
 */
export interface FormatInfo {
  isEuropeanFormat: boolean;
  decimalSeparator: ',' | '.';
}

interface RuleEvaluationResult {
  results: RuleResult[];
  debugInfo: {
    ruleId: string;
    ruleName: string;
    matched: boolean;
    confidence: number;
    value?: ReceiptInfo[keyof ReceiptInfo];
    field?: keyof ReceiptInfo;
  }[];
}

/**
 * The core rule engine for evaluating receipt rules against text elements
 */
export class ReceiptRuleEngine {
  private rules: ReceiptRule[] = [];
  private debugMode: boolean = false;
  private formatInfo: FormatInfo = {
    isEuropeanFormat: true, // Default to European format (comma as decimal)
    decimalSeparator: ','
  };

  constructor(rules: ReceiptRule[] = [], debugMode = false) {
    this.rules = rules;
    this.debugMode = debugMode;
  }

  /**
   * Add a rule to the engine
   */
  public addRule(rule: ReceiptRule): void {
    this.rules.push(rule);
  }

  /**
   * Add multiple rules to the engine
   */
  public addRules(rules: ReceiptRule[]): void {
    this.rules.push(...rules);
  }

  /**
   * Enable or disable debug mode
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
  
  /**
   * Set information about the number format detected in the receipt
   */
  public setFormatInfo(formatInfo: FormatInfo): void {
    this.formatInfo = formatInfo;
    
    if (this.debugMode) {
      console.log(`[Rule Engine] Set format info: ${JSON.stringify(formatInfo)}`);
    }
  }
  
  /**
   * Get the current format info
   */
  public getFormatInfo(): FormatInfo {
    return this.formatInfo;
  }

  /**
   * Evaluate all rules against all text elements
   */
  public evaluateRules(elements: TextElement[]): RuleEvaluationResult {
    const results: RuleResult[] = [];
    const debugInfo: RuleEvaluationResult['debugInfo'] = [];
    
    // Create a context object to share detected values between rules
    const context: RuleContext = {
      detectedValues: {}
    };
    
    // Sort rules by priority (higher priorities first)
    const sortedRules = [...this.rules].sort((a, b) => 
      (b.priority || 0) - (a.priority || 0)
    );
    
    // Apply each rule to each element
    for (const rule of sortedRules) {
      for (let i = 0; i < elements.length; i++) {
        // Check if all conditions are met
        const matchedConditions = rule.conditions.filter(condition => 
          condition.evaluate(elements, i)
        );
        
        const allConditionsMet = matchedConditions.length === rule.conditions.length;
        
        if (allConditionsMet) {
          // If all conditions are met, apply the rule's action
          // Pass format info and context to the action function
          const ruleResult = rule.action(elements, i, matchedConditions, this.formatInfo, context);
          
          if (ruleResult) {
            results.push(ruleResult);
            
            // Update context with the detected value
            context.detectedValues[ruleResult.field] = ruleResult.value;
            
            if (this.debugMode) {
              console.log(`[Rule ${rule.id}] Matched at element[${i}]: "${elements[i].text}"`);
              console.log(`[Rule ${rule.id}] Result: ${ruleResult.field} = ${ruleResult.value} (confidence: ${ruleResult.confidence})`);
              console.log(`[Rule ${rule.id}] Updated context: ${JSON.stringify(context.detectedValues)}`);
            }
            
            debugInfo.push({
              ruleId: rule.id,
              ruleName: rule.name,
              matched: true,
              confidence: ruleResult.confidence,
              field: ruleResult.field,
              value: ruleResult.value
            });
          }
        } else if (this.debugMode && matchedConditions.length > 0) {
          // Some conditions matched but not all
          console.log(`[Rule ${rule.id}] Partially matched at element[${i}]: "${elements[i].text}"`);
          console.log(`[Rule ${rule.id}] ${matchedConditions.length}/${rule.conditions.length} conditions met`);
          
          debugInfo.push({
            ruleId: rule.id,
            ruleName: rule.name,
            matched: false,
            confidence: 0
          });
        }
      }
    }
    
    return { results, debugInfo };
  }

  /**
   * Process rule evaluation results into a ReceiptInfo object
   */
  public processResults(evalResults: RuleEvaluationResult): ReceiptInfo {
    const { results } = evalResults;
    const receiptInfo: ReceiptInfo = {
      date: new Date(),
      total: 0,
      taxLow: 0,
      taxHigh: 0
    };
    
    // Process any multipleResults first to flatten the results array
    const allResults: RuleResult[] = [];
    
    for (const result of results) {
      if (result.multipleResults && Array.isArray(result.multipleResults)) {
        // Add all multiple results to our flattened results array
        allResults.push(...result.multipleResults);
      } else {
        // Add the single result
        allResults.push(result);
      }
    }
    
    // Group results by field and associate rule with each result
    const resultsByField: Record<keyof ReceiptInfo, Array<RuleResult & { rule?: ReceiptRule }>> = {
      date: [],
      total: [],
      taxLow: [],
      taxHigh: []
    };
    
    for (const result of allResults) {
      // Find original rule to get its priority
      const sourceRule = this.rules.find(r => r.id === result.ruleId);
      
      // Add result with its rule info
      resultsByField[result.field].push({
        ...result,
        rule: sourceRule
      });
    }
    
    // For each field, select the best result based on both rule priority and confidence
    for (const field of Object.keys(resultsByField) as Array<keyof ReceiptInfo>) {
      const fieldResults = resultsByField[field];
      
      // If this is the total field, apply special handling for Expert receipts
      if (field === 'total') {
        // Find the highest decimal value result - should be the total 99% of the time
        const highestValueRule = fieldResults.find(r => r.ruleId === 'total_highest_decimal_value');
        if (highestValueRule) {
          // Ensure the highest decimal value rule has higher confidence
          console.log(`[Total] Boosting highest decimal value rule confidence from ${highestValueRule.confidence} to 0.99 (highest priority)`);  
          highestValueRule.confidence = 0.99;
        }
      }
      
      // Sort results by combined score of rule priority and confidence
      fieldResults.sort((a, b) => {
        // Get rule priorities (default to 0 if not found)
        const priorityA = a.rule?.priority || 0;
        const priorityB = b.rule?.priority || 0;
        
        // Calculate combined score (normalize priority to 0-1 range)
        const scoreA = (priorityA / 100) * 0.7 + a.confidence * 0.3;
        const scoreB = (priorityB / 100) * 0.7 + b.confidence * 0.3;
        
        return scoreB - scoreA;
      });
      
      if (fieldResults.length > 0) {
        // Take the result with highest confidence
        const bestResult = fieldResults[0];
        
        // Debug output
        if (this.debugMode) {
          console.log(`[Field ${field}] Selected value from rule ${bestResult.ruleId}: ${bestResult.value} (confidence: ${bestResult.confidence})`);
          
          if (fieldResults.length > 1) {
            console.log(`[Field ${field}] Alternative values:`, 
              fieldResults.slice(1).map(r => `${r.value} (rule: ${r.ruleId}, confidence: ${r.confidence})`).join(', ')
            );
          }
        }
        
        // Apply the result to the receipt info
        receiptInfo[field] = bestResult.value;
      }
    }
    
    return receiptInfo;
  }

  /**
   * Evaluate all rules and process the results into a ReceiptInfo object
   */
  public extract(elements: TextElement[]): ReceiptInfo {
    const evalResults = this.evaluateRules(elements);
    return this.processResults(evalResults);
  }
}
