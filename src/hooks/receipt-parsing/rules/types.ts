import { TextElement, ReceiptInfo } from '../types';
import { FormatInfo } from './ruleEngine';

/**
 * Represents the result of applying a rule to receipt text elements
 */
export interface RuleResult {
  field: keyof ReceiptInfo;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RuleResult.value maps to ReceiptInfo fields (number | Date); using the precise union breaks assignment back to ReceiptInfo[field] in ruleEngine due to TypeScript intersection widening
  value: any;
  confidence: number;
  ruleId: string;
  multipleResults?: RuleResult[];
}

/**
 * Types of conditions that can be used for rules
 */
export enum ConditionType {
  TEXT_MATCH = 'TEXT_MATCH',
  REGEX_MATCH = 'REGEX_MATCH',
  POSITION = 'POSITION',
  ELEMENT_PROPERTY = 'ELEMENT_PROPERTY',
  CONTEXT = 'CONTEXT',
  SPATIAL = 'SPATIAL'
}

/**
 * Base condition interface
 */
export interface RuleCondition {
  type: ConditionType;
  evaluate: (elements: TextElement[], index: number) => boolean;
}

/**
 * Text matching condition
 */
export interface TextMatchCondition extends RuleCondition {
  type: ConditionType.TEXT_MATCH;
  value: string;
  matchType: 'exact' | 'includes' | 'startsWith' | 'endsWith';
  caseSensitive?: boolean;
}

/**
 * Regex matching condition
 */
export interface RegexMatchCondition extends RuleCondition {
  type: ConditionType.REGEX_MATCH;
  pattern: RegExp;
}

/**
 * Position condition for spatial analysis
 */
export interface PositionCondition extends RuleCondition {
  type: ConditionType.POSITION;
  relation: 'above' | 'below' | 'left' | 'right';
  targetIndex?: number; // If undefined, use the index passed to evaluate
  distanceThreshold?: number; // Max distance in pixels
}

/**
 * Element property condition
 */
export interface ElementPropertyCondition extends RuleCondition {
  type: ConditionType.ELEMENT_PROPERTY;
  property: 'isNumeric' | 'hasCoordinates' | 'hasSpecificFormat';
  parameters?: { formatRegex?: string };
}

/**
 * Context condition for checking surrounding elements
 */
export interface ContextCondition extends RuleCondition {
  type: ConditionType.CONTEXT;
  contextType: 'previous' | 'next' | 'nearby';
  lookupCondition: RuleCondition;
  range?: number;
}

/**
 * Spatial condition for checking spatial relationships between elements
 */
export interface SpatialCondition extends RuleCondition {
  type: ConditionType.SPATIAL;
  spatialRelation: 'sameLine' | 'directlyBelow' | 'toRightOf' | 'inSameColumn';
  referenceElementMatcher?: RuleCondition; // Optional condition to find a reference element
  referenceElementIndex?: number;         // Alternative: use a specific index
  tolerance?: number;                     // Custom tolerance value for spatial comparison
}

/**
 * Context object type containing already detected values
 */
export interface RuleContext {
  detectedValues: Partial<ReceiptInfo>;
}

/**
 * Rule action function type
 */
export type RuleAction = (
  elements: TextElement[], 
  index: number, 
  matchedConditions: RuleCondition[],
  formatInfo?: FormatInfo,
  context?: RuleContext
) => RuleResult | null;

/**
 * Receipt rule interface
 */
export interface ReceiptRule {
  id: string;
  name: string;
  description: string;
  applicableFields: Array<keyof ReceiptInfo>; // Which fields this rule can potentially extract
  conditions: RuleCondition[];
  action: RuleAction;
  priority?: number; // Higher priority rules will be evaluated first
}
