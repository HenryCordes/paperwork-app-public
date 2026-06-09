import { useState } from "react";
import {
  TextDetections,
  TextDetection,
} from "@capacitor-community/image-to-text";
import { TextElement, ReceiptInfo } from "./receipt-parsing/types";
import { extractReceiptInfo as parseReceiptFromModules } from "./receipt-parsing/bridge";

interface ScanDocumentResult {
  date: Date;
  total: number;
  taxLow: number;
  taxHigh: number;
  error?: string;
}

const useScanDocument = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanDocumentResult | null>(null);

  // Extract receipt information from OCR text elements
  // This now uses our modular implementation through the bridge pattern
  const extractReceiptInfo = (elements: TextElement[]): ReceiptInfo => {
    return parseReceiptFromModules(elements);
  };

  const processOCRResult = (ocrResult: TextDetections): ScanDocumentResult => {
    try {
      if (!ocrResult?.textDetections?.length) {
        throw new Error("No text found in the document");
      }

      // Map OCR blocks to our TextElement format
      const elements: TextElement[] = ocrResult.textDetections.map(
        (detection: TextDetection) => {
          // Use the coordinates from TextDetection object
          const { topLeft, topRight, bottomRight, bottomLeft, text } =
            detection;

          return {
            text,
            topLeft,
            topRight,
            bottomLeft,
            bottomRight,
          };
        }
      );

      // Extract receipt information using our new modular approach
      const receiptInfo = extractReceiptInfo(elements);

      return {
        date: receiptInfo.date,
        total: receiptInfo.total,
        taxLow: receiptInfo.taxLow,
        taxHigh: receiptInfo.taxHigh,
      };
    } catch (err) {
      console.error("Error processing OCR result:", err);
      return {
        date: new Date(),
        total: 0,
        taxLow: 0,
        taxHigh: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  };

  const scanDocument = async (): Promise<ScanDocumentResult> => {
    try {
      setIsLoading(true);
      setError(null);

      // This function would call the OCR service with the imageData
      // For now, we'll simulate it with a mock result for testing
      const mockOcrResult: TextDetections = {
        textDetections: [
          {
            text: "Receipt",
            topLeft: [10, 10],
            topRight: [50, 10],
            bottomRight: [50, 30],
            bottomLeft: [10, 30],
          },
          {
            text: "Total: 34.50",
            topLeft: [10, 40],
            topRight: [80, 40],
            bottomRight: [80, 60],
            bottomLeft: [10, 60],
          },
          {
            text: "BTW LAAG: 1.43",
            topLeft: [10, 70],
            topRight: [90, 70],
            bottomRight: [90, 90],
            bottomLeft: [10, 90],
          },
          {
            text: "Date: 2023-05-01",
            topLeft: [10, 100],
            topRight: [100, 100],
            bottomRight: [100, 120],
            bottomLeft: [10, 120],
          },
        ],
      };

      // In a real implementation, you would call the OCR service here
      // const ocrResult = await yourOCRService.recognize(imageData);

      const scanResult = processOCRResult(mockOcrResult);
      setResult(scanResult);
      return scanResult;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error during scan";
      console.error("Error scanning document:", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    scanDocument,
    extractReceiptInfo,
    isLoading,
    error,
    result,
  };
};

export default useScanDocument;
