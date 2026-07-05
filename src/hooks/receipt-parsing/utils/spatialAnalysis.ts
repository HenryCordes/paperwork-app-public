import { TextElement } from "../types";

/**
 * Debug configuration for spatial analysis
 */
export const SPATIAL_DEBUG = {
  ENABLED: false,      // Master switch for debug logging
  PREFIX: 'SPATIAL',  // Prefix for debug logs
  showCoordinates: true,  // Show coordinate values in logs
  showDifference: true    // Show difference calculations in logs
};

/**
 * Tolerance values for spatial analysis (in pixels)
 * More relaxed values account for OCR accuracy variations
 */
export const SPATIAL_TOLERANCES = {
  SAME_LINE: 0.02,     // Maximum vertical difference for elements on same line (was 5)
  ADJACENT_LINE: 20,   // Maximum vertical gap between adjacent lines
  SAME_COLUMN: 20,     // Maximum horizontal difference for elements in same column
  ADJACENT_COLUMN: 20  // Maximum horizontal gap between adjacent columns
};

/**
 * Optional debug logging for spatial analysis functions
 * @param prefix Category prefix for the log
 * @param message Debug message to log
 */
function debugLog(prefix: string, message: string): void {
  if (SPATIAL_DEBUG.ENABLED) {
    console.log(`[${SPATIAL_DEBUG.PREFIX}:${prefix}] ${message}`);
  }
}

/**
 * Helper function to safely get X coordinate from a point tuple
 * @param point Coordinate tuple [x, y]
 * @returns X coordinate or 0 if point is undefined
 */
function getX(point?: [number, number]): number {
  return point?.[0] ?? 0;
}

/**
 * Helper function to safely get Y coordinate from a point tuple
 * @param point Coordinate tuple [x, y]
 * @returns Y coordinate or 0 if point is undefined
 */
function getY(point?: [number, number]): number {
  return point?.[1] ?? 0;
}

/**
 * Helper function to check if a TextElement has coordinate data
 * @param element Text element to check
 * @returns True if the element has valid coordinate data
 */
export function hasCoordinates(element: TextElement): boolean {
  return !!(element.topLeft && element.topRight && element.bottomLeft && element.bottomRight);
}

/**
 * Helper function to check if two elements have horizontal overlap
 * @param element1 First text element
 * @param element2 Second text element
 * @returns True if elements overlap horizontally
 */
function hasHorizontalOverlap(element1: TextElement, element2: TextElement): boolean {
  return getX(element1.topLeft) < getX(element2.topRight) && 
         getX(element1.topRight) > getX(element2.topLeft);
}

/**
 * Helper function to check if two elements have vertical overlap
 * @param element1 First text element
 * @param element2 Second text element
 * @returns True if elements overlap vertically
 */
function hasVerticalOverlap(element1: TextElement, element2: TextElement): boolean {
  return getY(element1.topLeft) < getY(element2.bottomLeft) && 
         getY(element1.bottomLeft) > getY(element2.topLeft);
}

/**
 * Options for isOnSameLine function
 */
export interface SameLineOptions {
  // The method to use for comparison
  method?: 'mid' | 'top' | 'bottom' | 'overlap' | 'combined';
  // Default tolerance for vertical difference
  tolerance?: number;
  // More permissive tolerance used with combined approach
  permissiveTolerance?: number;
  // Minimum vertical overlap percentage required for 'overlap' method (0-1)
  minOverlapPercent?: number;
}

/**
 * Checks if two text elements are on the same line
 * @param element1 First text element
 * @param element2 Second text element
 * @param options Configuration options or tolerance value
 * @returns True if elements are on the same line
 */
export const isOnSameLine = (
  a: TextElement, 
  b: TextElement, 
  options: number | SameLineOptions = 0.015
): boolean => {
  // If elements don't have coordinates, they can't be compared spatially
  if (!hasCoordinates(a) || !hasCoordinates(b)) {
    debugLog('SameLine', 'Missing coordinates for comparison');
    return false;
  }

  // Normalize options
  const normalizedOptions: SameLineOptions = typeof options === 'number' 
    ? { tolerance: options } 
    : options;
  
  const {
    method = 'combined',
    tolerance = 0.015,
    permissiveTolerance = 0.025,
    minOverlapPercent = 0.5
  } = normalizedOptions;
  
  let onSameLine = false;
  let diff: number = 0;
  
  // Handle different comparison methods
  switch (method) {
    case 'mid': {
      // Original approach using midpoint of elements
      const midY1 = (getY(a.topLeft) + getY(a.bottomLeft)) / 2;
      const midY2 = (getY(b.topLeft) + getY(b.bottomLeft)) / 2;
      diff = Math.abs(midY1 - midY2);
      onSameLine = diff <= tolerance;
      
      if (SPATIAL_DEBUG.ENABLED) {
        debugLog('SameLine:mid', `"${a.text}" (midY=${midY1.toFixed(4)}) and "${b.text}" ` + 
          `(midY=${midY2.toFixed(4)}) diff=${diff.toFixed(5)}, same line? ${onSameLine}`);
      }
      break;
    }
      
    case 'top': {
      // Compare just the top Y coordinates
      const topY1 = getY(a.topLeft);
      const topY2 = getY(b.topLeft);
      diff = Math.abs(topY1 - topY2);
      onSameLine = diff <= tolerance;
      
      if (SPATIAL_DEBUG.ENABLED) {
        debugLog('SameLine:top', `"${a.text}" (topY=${topY1.toFixed(4)}) and "${b.text}" ` + 
          `(topY=${topY2.toFixed(4)}) diff=${diff.toFixed(5)}, same line? ${onSameLine}`);
      }
      break;
    }
      
    case 'bottom': {
      // Compare just the bottom Y coordinates
      const bottomY1 = getY(a.bottomLeft);
      const bottomY2 = getY(b.bottomLeft);
      diff = Math.abs(bottomY1 - bottomY2);
      onSameLine = diff <= tolerance;
      
      if (SPATIAL_DEBUG.ENABLED) {
        debugLog('SameLine:bottom', `"${a.text}" (bottomY=${bottomY1.toFixed(4)}) and "${b.text}" ` + 
          `(bottomY=${bottomY2.toFixed(4)}) diff=${diff.toFixed(5)}, same line? ${onSameLine}`);
      }
      break;
    }
      
    case 'overlap': {
      // Check for vertical overlap between the elements
      const aTop = getY(a.topLeft);
      const aBottom = getY(a.bottomLeft);
      const bTop = getY(b.topLeft);
      const bBottom = getY(b.bottomLeft);
      
      const aHeight = aBottom - aTop;
      const bHeight = bBottom - bTop;
      
      // Calculate overlap
      const overlapTop = Math.max(aTop, bTop);
      const overlapBottom = Math.min(aBottom, bBottom);
      const overlapHeight = Math.max(0, overlapBottom - overlapTop);
      
      // Calculate overlap percentage relative to the smaller element
      const smallerHeight = Math.min(aHeight, bHeight);
      const overlapPercent = smallerHeight > 0 ? overlapHeight / smallerHeight : 0;
      
      onSameLine = overlapPercent >= minOverlapPercent;
      
      if (SPATIAL_DEBUG.ENABLED) {
        debugLog('SameLine:overlap', `"${a.text}" and "${b.text}" overlap=${overlapPercent.toFixed(2)}, ` + 
          `same line? ${onSameLine}`);
      }
      break;
    }
      
    case 'combined':
    default: {
      // COMBINED APPROACH: Use multiple methods for more robust detection
      // 1. First try strict top alignment (good for tables and aligned content)
      const topY1 = getY(a.topLeft);
      const topY2 = getY(b.topLeft);
      const topDiff = Math.abs(topY1 - topY2);
      const topAligned = topDiff <= tolerance;
      
      // 2. Then try midpoint alignment (better for varying element heights)
      const midY1 = (getY(a.topLeft) + getY(a.bottomLeft)) / 2;
      const midY2 = (getY(b.topLeft) + getY(b.bottomLeft)) / 2;
      const midDiff = Math.abs(midY1 - midY2);
      const midAligned = midDiff <= permissiveTolerance;
      
      // 3. Finally check vertical overlap
      const aTop = getY(a.topLeft);
      const aBottom = getY(a.bottomLeft);
      const bTop = getY(b.topLeft);
      const bBottom = getY(b.bottomLeft);
      
      const overlapTop = Math.max(aTop, bTop);
      const overlapBottom = Math.min(aBottom, bBottom);
      const hasOverlap = overlapBottom > overlapTop;
      
      // Elements are on the same line if they have good top alignment,
      // OR if they have acceptable midpoint alignment AND some vertical overlap
      onSameLine = topAligned || (midAligned && hasOverlap);
      diff = Math.min(topDiff, midDiff);
      
      if (SPATIAL_DEBUG.ENABLED) {
        debugLog('SameLine:combined', 
          `"${a.text}" and "${b.text}": ` + 
          `topDiff=${topDiff.toFixed(5)}, midDiff=${midDiff.toFixed(5)}, ` + 
          `hasOverlap=${hasOverlap}, same line? ${onSameLine}`);
      }
      break;
    }
  }
  
  return onSameLine;
}

/**
 * More relaxed spatial proximity check for elements that might be nearby but not exactly on the same line
 * @param element1 First text element
 * @param element2 Second text element
 * @param tolerance Maximum vertical difference to consider as spatially near
 * @returns True if elements are spatially near each other vertically
 */
export const isSpatiallyNear = (a: TextElement, b: TextElement, tolerance = 0.06): boolean => {
  // If elements don't have coordinates, they can't be compared spatially
  if (!hasCoordinates(a) || !hasCoordinates(b)) {
    debugLog('SpatialNear', 'Missing coordinates for comparison');
    return false;
  }

  // Calculate middle y-position of each element
  const midY1 = (getY(a.topLeft) + getY(a.bottomLeft)) / 2;
  const midY2 = (getY(b.topLeft) + getY(b.bottomLeft)) / 2;

  // Elements are spatially near if their vertical centers are within tolerance
  const diff = Math.abs(midY1 - midY2);
  const isNear = diff <= tolerance;
  
  if (SPATIAL_DEBUG.ENABLED) {
    debugLog('SpatialNear', `"${a.text}" (y=${midY1.toFixed(4)}) is near ` +
      `"${b.text}" (y=${midY2.toFixed(4)})? ${isNear} [diff=${diff.toFixed(5)}]`);
  }

  return isNear;
}

/**
 * Checks if element2 is directly below element1
 * @param element1 Upper text element
 * @param element2 Lower text element
 * @param tolerance Maximum vertical gap (pixels) to consider as directly below
 * @returns True if element2 is directly below element1
 */
export function isDirectlyBelow(
  element1: TextElement, 
  element2: TextElement, 
  tolerance = SPATIAL_TOLERANCES.ADJACENT_LINE
): boolean {
  // If elements don't have coordinates, they can't be compared spatially
  if (!hasCoordinates(element1) || !hasCoordinates(element2)) {
    debugLog('DirectlyBelow', 'Missing coordinates for comparison');
    return false;
  }

  // Element2 is directly below Element1 if there's a reasonable vertical gap
  // and they have some horizontal overlap
  const verticalGap = getY(element2.topLeft) - getY(element1.bottomLeft);
  
  // Check if the vertical gap is positive and within tolerance
  const isBelow = verticalGap >= 0 && verticalGap <= tolerance;
  
  // Check if there's horizontal overlap between the elements
  const horizontalOverlap = hasHorizontalOverlap(element1, element2);
  
  const result = isBelow && horizontalOverlap;
  
  if (SPATIAL_DEBUG.ENABLED) {
    debugLog('DirectlyBelow', `"${element1.text}" is above "${element2.text}"? ` +
      `${result} [vGap=${verticalGap.toFixed(4)}, hOverlap=${horizontalOverlap}]`);
  }
  
  return result;
}

/**
 * Checks if element2 is to the right of element1
 * @param element1 Left text element
 * @param element2 Right text element
 * @param tolerance Maximum horizontal gap (pixels) to consider as adjacent
 * @returns True if element2 is to the right of element1
 */
export function isToRightOf(
  element1: TextElement, 
  element2: TextElement, 
  tolerance = SPATIAL_TOLERANCES.ADJACENT_COLUMN
): boolean {
  // If elements don't have coordinates, they can't be compared spatially
  if (!hasCoordinates(element1) || !hasCoordinates(element2)) {
    debugLog('ToRightOf', 'Missing coordinates for comparison');
    return false;
  }

  // Element2 is to the right of Element1 if there's a reasonable horizontal gap
  // and they have some vertical overlap
  const horizontalGap = getX(element2.topLeft) - getX(element1.topRight);
  
  // Check if the horizontal gap is positive and within tolerance
  const isToRight = horizontalGap >= 0 && horizontalGap <= tolerance;
  
  // Check if there's vertical overlap between the elements
  const verticalOverlap = hasVerticalOverlap(element1, element2);
  
  const result = isToRight && verticalOverlap;
  
  if (SPATIAL_DEBUG.ENABLED) {
    debugLog('ToRightOf', `"${element1.text}" is left of "${element2.text}"? ` +
      `${result} [hGap=${horizontalGap.toFixed(4)}, vOverlap=${verticalOverlap}]`);
  }
  
  return result;
}

/**
 * Checks if two elements are in the same column
 * @param element1 First text element
 * @param element2 Second text element
 * @param tolerance Maximum horizontal difference (pixels) to consider as same column
 * @returns True if elements are in the same column
 */
export function isInSameColumn(
  element1: TextElement, 
  element2: TextElement, 
  tolerance = SPATIAL_TOLERANCES.SAME_COLUMN
): boolean {
  // If elements don't have coordinates, they can't be compared spatially
  if (!hasCoordinates(element1) || !hasCoordinates(element2)) {
    debugLog('SameColumn', 'Missing coordinates for comparison');
    return false;
  }

  // Calculate middle x-position of each element
  const midX1 = (getX(element1.topLeft) + getX(element1.topRight)) / 2;
  const midX2 = (getX(element2.topLeft) + getX(element2.topRight)) / 2;

  // Elements are in the same column if their horizontal centers are within tolerance
  const diff = Math.abs(midX1 - midX2);
  const inSameColumn = diff <= tolerance;
  
  if (SPATIAL_DEBUG.ENABLED) {
    debugLog('SameColumn', `"${element1.text}" (x=${midX1.toFixed(4)}) and "${element2.text}" ` +
      `(x=${midX2.toFixed(4)}) in same column? ${inSameColumn} [diff=${diff.toFixed(5)}]`);
  }
  
  return inSameColumn;
}

/**
 * Finds the text element closest to the specified element in the given direction
 * @param element The reference text element
 * @param elements Array of all text elements to search
 * @param direction The direction to search ('below', 'right', 'above', 'left')
 * @returns The closest element in the specified direction, or null if none found
 */
export function findClosestElementInDirection(
  element: TextElement,
  elements: TextElement[],
  direction: 'below' | 'right' | 'above' | 'left'
): TextElement | null {
  // If element doesn't have coordinates, can't perform spatial search
  if (!hasCoordinates(element)) {
    return null;
  }

  let closest: TextElement | null = null;
  let minDistance = Number.MAX_VALUE;

  for (const candidate of elements) {
    // Skip the element itself and elements without coordinates
    if (candidate === element || !hasCoordinates(candidate)) {
      continue;
    }

    switch (direction) {
      case 'below':
        // Candidate must be below the reference element
        if (getY(candidate.topLeft) > getY(element.bottomLeft)) {
          // Check if there's horizontal overlap
          if (hasHorizontalOverlap(element, candidate)) {
            const distance = getY(candidate.topLeft) - getY(element.bottomLeft);
            if (distance < minDistance) {
              minDistance = distance;
              closest = candidate;
            }
          }
        }
        break;

      case 'right':
        // Candidate must be to the right of the reference element
        if (getX(candidate.topLeft) > getX(element.topRight)) {
          // Check if there's vertical overlap
          if (hasVerticalOverlap(element, candidate)) {
            const distance = getX(candidate.topLeft) - getX(element.topRight);
            if (distance < minDistance) {
              minDistance = distance;
              closest = candidate;
            }
          }
        }
        break;

      case 'above':
        // Candidate must be above the reference element
        if (getY(candidate.bottomLeft) < getY(element.topLeft)) {
          // Check if there's horizontal overlap
          if (hasHorizontalOverlap(element, candidate)) {
            const distance = getY(element.topLeft) - getY(candidate.bottomLeft);
            if (distance < minDistance) {
              minDistance = distance;
              closest = candidate;
            }
          }
        }
        break;

      case 'left':
        // Candidate must be to the left of the reference element
        if (getX(candidate.topRight) < getX(element.topLeft)) {
          // Check if there's vertical overlap
          if (hasVerticalOverlap(element, candidate)) {
            const distance = getX(element.topLeft) - getX(candidate.topRight);
            if (distance < minDistance) {
              minDistance = distance;
              closest = candidate;
            }
          }
        }
        break;
    }
  }

  return closest;
}

/**
 * Finds all text elements in the same row as the reference element
 * @param element The reference text element
 * @param elements Array of all text elements to search
 * @returns Array of elements on the same row, ordered from left to right
 */
export function findElementsInSameRow(
  element: TextElement,
  elements: TextElement[]
): TextElement[] {
  // If element doesn't have coordinates, can't perform spatial search
  if (!hasCoordinates(element)) {
    return [];
  }

  // Find all elements on the same line as the reference element
  const sameRowElements = elements.filter(candidate => 
    candidate !== element && 
    hasCoordinates(candidate) && 
    isOnSameLine(element, candidate)
  );

  // Sort the elements from left to right
  return sameRowElements.sort((a, b) => getX(a.topLeft) - getX(b.topLeft));
}

/**
 * Finds all text elements in the same column as the reference element
 * @param element The reference text element
 * @param elements Array of all text elements to search
 * @returns Array of elements in the same column, ordered from top to bottom
 */
export function findElementsInSameColumn(
  element: TextElement,
  elements: TextElement[]
): TextElement[] {
  // If element doesn't have coordinates, can't perform spatial search
  if (!hasCoordinates(element)) {
    return [];
  }

  // Find all elements in the same column as the reference element
  const sameColumnElements = elements.filter(candidate => 
    candidate !== element && 
    hasCoordinates(candidate) && 
    isInSameColumn(element, candidate)
  );

  // Sort the elements from top to bottom
  return sameColumnElements.sort((a, b) => getY(a.topLeft) - getY(b.topLeft));
}
