import { TextElement, ReceiptInfo } from "./types";
import { extractReceiptInfo as newExtractReceiptInfo } from "./index";

// Export the extractReceiptInfo function which now uses the new implementation
export const extractReceiptInfo = (elements: TextElement[]): ReceiptInfo => {
  return newExtractReceiptInfo(elements);
};
