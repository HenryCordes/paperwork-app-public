import {
  RuleCondition,
  TextMatchCondition,
  RegexMatchCondition,
  PositionCondition,
  ElementPropertyCondition,
  ContextCondition,
  ConditionType
} from './types';
import { TextElement } from '../types';

/**
 * Factory functions to create different types of rule conditions
 */
export const createTextMatchCondition = (
  value: string, 
  matchType: 'exact' | 'includes' | 'startsWith' | 'endsWith', 
  caseSensitive = false
): TextMatchCondition => {
  return {
    type: ConditionType.TEXT_MATCH,
    value,
    matchType,
    caseSensitive,
    evaluate: (elements: TextElement[], index: number): boolean => {
      const text = elements[index].text;
      const compareValue = caseSensitive ? text : text.toLowerCase();
      const matchValue = caseSensitive ? value : value.toLowerCase();
      
      switch (matchType) {
        case 'exact':
          return compareValue === matchValue;
        case 'includes':
          return compareValue.includes(matchValue);
        case 'startsWith':
          return compareValue.startsWith(matchValue);
        case 'endsWith':
          return compareValue.endsWith(matchValue);
      }
    }
  };
};

export const createRegexMatchCondition = (pattern: RegExp): RegexMatchCondition => {
  return {
    type: ConditionType.REGEX_MATCH,
    pattern,
    evaluate: (elements: TextElement[], index: number): boolean => {
      return pattern.test(elements[index].text);
    }
  };
};

export const createPositionCondition = (
  relation: 'above' | 'below' | 'left' | 'right',
  targetIndex?: number,
  distanceThreshold?: number
): PositionCondition => {
  return {
    type: ConditionType.POSITION,
    relation,
    targetIndex,
    distanceThreshold,
    evaluate: (elements: TextElement[], index: number): boolean => {
      const currentElement = elements[index];
      const targetElement = elements[targetIndex !== undefined ? targetIndex : index];
      
      // Skip evaluation if elements don't have coordinates
      if (!currentElement.topLeft || !targetElement.topLeft) {
        return false;
      }
      
      switch (relation) {
        case 'above':
          return currentElement.bottomLeft![1] < targetElement.topLeft[1];
        case 'below':
          return currentElement.topLeft[1] > targetElement.bottomLeft![1];
        case 'left':
          return currentElement.topRight![0] < targetElement.topLeft[0];
        case 'right':
          return currentElement.topLeft[0] > targetElement.topRight![0];
      }
    }
  };
};

export const createElementPropertyCondition = (
  property: 'isNumeric' | 'hasCoordinates' | 'hasSpecificFormat',
  parameters?: { formatRegex?: string }
): ElementPropertyCondition => {
  return {
    type: ConditionType.ELEMENT_PROPERTY,
    property,
    parameters,
    evaluate: (elements: TextElement[], index: number): boolean => {
      const element = elements[index];
      
      switch (property) {
        case 'isNumeric':
          return /^-?\d+([.,]\d+)?$/.test(element.text.trim());
        case 'hasCoordinates':
          return !!(element.topLeft && element.topRight && element.bottomLeft && element.bottomRight);
        case 'hasSpecificFormat':
          // Use the parameters to check for specific format
          if (parameters && parameters.formatRegex) {
            return new RegExp(parameters.formatRegex).test(element.text);
          }
          return false;
      }
    }
  };
};

export const createContextCondition = (
  contextType: 'previous' | 'next' | 'nearby',
  lookupCondition: RuleCondition,
  range = 1
): ContextCondition => {
  return {
    type: ConditionType.CONTEXT,
    contextType,
    lookupCondition,
    range,
    evaluate: (elements: TextElement[], index: number): boolean => {
      switch (contextType) {
        case 'previous':
          for (let i = Math.max(0, index - range); i < index; i++) {
            if (lookupCondition.evaluate(elements, i)) {
              return true;
            }
          }
          return false;
        case 'next':
          for (let i = index + 1; i <= Math.min(elements.length - 1, index + range); i++) {
            if (lookupCondition.evaluate(elements, i)) {
              return true;
            }
          }
          return false;
        case 'nearby':
          for (let i = Math.max(0, index - range); i <= Math.min(elements.length - 1, index + range); i++) {
            if (i !== index && lookupCondition.evaluate(elements, i)) {
              return true;
            }
          }
          return false;
      }
    }
  };
};
