import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { DocumentScanner } from "capacitor-document-scanner";
import { Ocr, TextDetections } from "@capacitor-community/image-to-text";
import { ReceiptInfo, TextElement } from "./receipt-parsing/types";
import { extractReceiptInfo } from "./receipt-parsing";
import invoiceExtractionService, {
  InvoiceExtraction,
} from "../api/services/invoiceExtractionService";

const VAT_RATE_LOW = 9;
const VAT_RATE_HIGH = 21;

export interface ScanResult {
  imageUrl: string;
  imagePath: string;
  receiptInfo: ReceiptInfo | null;
  rawText: string[];
  rawTextElements?: TextElement[];
  parsingMethod?: "rule-engine" | "legacy" | "llm";
  extraction?: InvoiceExtraction;
  fileLocation?: string;
}

/**
 * Parses an LLM-extracted invoiceDate (untrusted, crosses a network boundary)
 * into a valid Date, falling back to "today" for null or unparseable input
 * rather than propagating an Invalid Date downstream.
 */
export function parseExtractedInvoiceDate(value: string | null): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Builds a sanitized receipt filename (bon_<vendor>_<date>_<timestamp>.jpg)
 * shared by the Bonnen-folder move here and Edit/index.tsx's handleScan,
 * which independently built the same filename before this extraction.
 */
export function buildReceiptFileName(
  vendor: string | null,
  date: Date | null,
): string {
  const dateStr =
    date && !Number.isNaN(date.getTime())
      ? date.toISOString().split("T")[0].replace(/-/g, "")
      : new Date().toISOString().split("T")[0].replace(/-/g, "");
  const timestamp = new Date().getTime();
  const sanitizedVendor = (vendor || "onbekend")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 30);
  return `bon_${sanitizedVendor}_${dateStr}_${timestamp}.jpg`;
}

export const useScan = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [useRuleEngine, setUseRuleEngine] = useState(true);
  const areDebugging = import.meta.env.VITE_APP_DEBUG_MODE === "true";
  const [debugMode, setDebugMode] = useState(areDebugging);
  const [useLlmExtraction, setUseLlmExtraction] = useState(
    import.meta.env.VITE_APP_LLM_EXTRACTION_ENABLED === "true"
  );

  /**
   * Scan a document using the device camera
   * Uses document scanner and either the backend LLM extractor or on-device
   * OCR + rules engine to extract receipt info, depending on useLlmExtraction
   */
  const scanDocument = async (): Promise<ScanResult | null> => {
    try {
      setIsScanning(true);
      setScanError(null);

      // Start the document scanner with maxNumDocuments: 1 to prevent multiple scans
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1, // Limit to one document per scan session
      });

      // Check if we have scanned images
      if (scannedImages?.length && scannedImages.length > 0) {
        const imagePath = scannedImages[0];
        let usedLlm = false;

        try {
          let extractedInfo: ReceiptInfo | null = null;
          let textElements: TextElement[] = [];
          let parsingMethod: ScanResult["parsingMethod"];
          let llmExtraction: InvoiceExtraction | undefined;
          let llmFileLocation: string | undefined;

          if (useLlmExtraction) {
            try {
              const imageUrl = Capacitor.convertFileSrc(imagePath);
              const blob = await (await fetch(imageUrl)).blob();
              const file = new File([blob], "scan.jpg", {
                type: "image/jpeg",
              });

              const scanResult = await invoiceExtractionService.scanInvoice(
                file
              );
              llmExtraction = scanResult.extraction;
              llmFileLocation = scanResult.fileLocation;

              if (debugMode) {
                console.log("==BON== LLM extraction", scanResult.extraction);
                console.log("==BON== LLM confidence", scanResult.confidence);
                console.log(
                  "==BON== LLM validation warnings",
                  scanResult.validation.warnings
                );
                console.log("==BON== LLM meta", scanResult.meta);
              }

              const taxLow = scanResult.extraction.vatBreakdown
                .filter((entry) => entry.rate === VAT_RATE_LOW)
                .reduce((sum, entry) => sum + entry.amount, 0);
              const taxHigh = scanResult.extraction.vatBreakdown
                .filter((entry) => entry.rate === VAT_RATE_HIGH)
                .reduce((sum, entry) => sum + entry.amount, 0);

              if (debugMode) {
                scanResult.extraction.vatBreakdown.forEach((entry) => {
                  if (
                    entry.rate !== VAT_RATE_LOW &&
                    entry.rate !== VAT_RATE_HIGH &&
                    entry.rate !== 0
                  ) {
                    console.warn(
                      "==BON== VAT entry with unexpected rate, excluded from taxLow/taxHigh:",
                      `rate=${entry.rate} amount=${entry.amount}`,
                    );
                  }
                });
              }

              extractedInfo = {
                date: parseExtractedInvoiceDate(
                  scanResult.extraction.invoiceDate
                ),
                total: scanResult.extraction.total,
                taxLow,
                taxHigh,
              };
              parsingMethod = "llm";
              usedLlm = true;
            } catch (llmError) {
              console.error(
                "LLM extraction failed, falling back to on-device OCR",
                llmError
              );
              extractedInfo = null;
              parsingMethod = undefined;
            }
          }

          if (!usedLlm) {
            // Perform OCR on the scanned image
            const results: TextDetections = await Ocr.detectText({
              filename: imagePath,
            });

            // Convert TextDetection objects to TextElement objects with coordinates
            textElements = results.textDetections.map((res) => ({
              text: res.text,
              topLeft: res.topLeft,
              topRight: res.topRight,
              bottomLeft: res.bottomLeft,
              bottomRight: res.bottomRight,
            }));

            if (debugMode) {
              results.textDetections.forEach((el) => {
                console.log("==BON== textelement", el, debugMode);
              });
            }

            // Process the OCR text to extract receipt information using the rule engine or legacy approach
            extractedInfo = extractReceiptInfo(
              textElements,
              useRuleEngine,
              debugMode
            );
            parsingMethod = useRuleEngine ? "rule-engine" : "legacy";
          }

          const rawText = usedLlm
            ? [llmExtraction?.vendor ?? "onbekend"]
            : textElements.map((el) => el.text);

          // Move to Bonnen folder with proper filename if on native platform
          let savedImagePath = imagePath;
          if (Capacitor.isNativePlatform()) {
            try {
              // Create Bonnen folder (ignore if already exists)
              try {
                await Filesystem.mkdir({
                  path: "Bonnen",
                  directory: Directory.Documents,
                  recursive: true,
                });
              } catch (mkdirError) {
                // Ignore "already exists" error
                const error = mkdirError as { message?: string };
                if (!error.message?.includes("already exists")) {
                  throw mkdirError;
                }
              }

              // Generate filename with vendor and date from OCR/LLM
              const fileName = buildReceiptFileName(
                rawText[0] || null,
                extractedInfo?.date ?? null,
              );

              // Read the temp file
              const tempFile = await Filesystem.readFile({
                path: imagePath,
              });

              // Write to Bonnen folder
              const result = await Filesystem.writeFile({
                path: `Bonnen/${fileName}`,
                data: tempFile.data,
                directory: Directory.Documents,
              });

              // Delete the original temp file using the URI
              try {
                await Filesystem.deleteFile({
                  path: imagePath,
                });
                console.log(`Deleted temp file: ${imagePath}`);
              } catch (deleteError) {
                console.log("Could not delete temp file:", deleteError);
                // The file might be in a different location or already deleted
              }

              savedImagePath = result.uri;
              console.log(`Moved receipt to: ${result.uri}`);
            } catch (error) {
              console.log("Error moving to Bonnen folder:", error);
              // Continue with temp path if move fails
            }
          }

          return {
            imageUrl: Capacitor.convertFileSrc(savedImagePath),
            imagePath: savedImagePath,
            receiptInfo: extractedInfo,
            rawText,
            rawTextElements: usedLlm ? undefined : textElements,
            parsingMethod,
            extraction: llmExtraction,
            fileLocation: llmFileLocation,
          };
        } catch (scanFailure) {
          console.error("OCR error", scanFailure);
          setScanError(
            "Error detecting text. The image may be unclear or the server connection was lost."
          );
          return null;
        }
      } else {
        setScanError("No image was scanned");
        return null;
      }
    } catch (error) {
      console.error("Error scanning document", error);
      setScanError(
        error instanceof Error
          ? error.message
          : "An error occurred during scanning"
      );
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  const logReceiptDataForTesting = (
    results: TextDetections,
    receiptName: string = "unknown"
  ) => {
    console.log(`\n==BON== START RECEIPT DATA: ${receiptName} ==BON==`);
    console.log(`const mockTextElements = [`);

    results.textDetections.forEach((el, index) => {
      console.log(`  {`);
      console.log(`    text: "${el.text.replace(/"/g, '\\"')}",`);
      console.log(`    topLeft: [${el.topLeft[0]}, ${el.topLeft[1]}],`);
      console.log(
        `    topRight: [${el.topRight[0]}, ${el.topRight[1]}],`
      );
      console.log(
        `    bottomLeft: [${el.bottomLeft[0]}, ${el.bottomLeft[1]}],`
      );
      console.log(
        `    bottomRight: [${el.bottomRight[0]}, ${el.bottomRight[1]}],`
      );
      console.log(`  }${index < results.textDetections.length - 1 ? "," : ""}`);
    });

    console.log(`];`);
    console.log(`==BON== END RECEIPT DATA ==BON==\n`);
  };

  return {
    scanDocument,
    isScanning,
    scanError,
    useRuleEngine,
    setUseRuleEngine,
    debugMode,
    setDebugMode,
    useLlmExtraction,
    setUseLlmExtraction,
    logReceiptDataForTesting,
  };
};
