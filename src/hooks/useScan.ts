import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { DocumentScanner } from "capacitor-document-scanner";
import { Ocr, TextDetections } from "@capacitor-community/image-to-text";
import { ReceiptInfo, TextElement } from "./receipt-parsing/types";
import { extractReceiptInfo } from "./receipt-parsing";

export interface ScanResult {
  imageUrl: string;
  imagePath: string;
  receiptInfo: ReceiptInfo | null;
  rawText: string[];
  rawTextElements?: TextElement[];
  parsingMethod?: "rule-engine" | "legacy";
}

export const useScan = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [useRuleEngine, setUseRuleEngine] = useState(true);
  const areDebugging = import.meta.env.VITE_APP_DEBUG_MODE === "true";
  const [debugMode, setDebugMode] = useState(areDebugging);

  /**
   * Scan a document using the device camera
   * Uses document scanner and OCR to extract text and receipt info
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

        try {
          // Perform OCR on the scanned image
          const results: TextDetections = await Ocr.detectText({
            filename: imagePath,
          });

          // Convert TextDetection objects to TextElement objects with coordinates
          const textElements: TextElement[] = results.textDetections.map(
            (res) => ({
              text: res.text,
              topLeft: res.topLeft,
              topRight: res.topRight,
              bottomLeft: res.bottomLeft,
              bottomRight: res.bottomRight,
            })
          );

          if (debugMode) {
            results.textDetections.forEach((el) => {
              console.log("==BON== textelement", el, debugMode);
            });
          }

          // Process the OCR text to extract receipt information using the rule engine or legacy approach
          const extractedInfo = extractReceiptInfo(
            textElements,
            useRuleEngine,
            debugMode
          );

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

              // Generate filename with vendor and date from OCR
              const vendor = textElements[0]?.text || "onbekend";
              const date = extractedInfo?.date
                ? new Date(extractedInfo.date)
                    .toISOString()
                    .split("T")[0]
                    .replace(/-/g, "")
                : new Date().toISOString().split("T")[0].replace(/-/g, "");
              const timestamp = new Date().getTime();

              // Sanitize vendor name for filename
              const sanitizedVendor = vendor
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "_")
                .replace(/_+/g, "_")
                .substring(0, 30);

              const fileName = `bon_${sanitizedVendor}_${date}_${timestamp}.jpg`;

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
            rawText: textElements.map((el) => el.text),
            rawTextElements: textElements,
            parsingMethod: useRuleEngine ? "rule-engine" : "legacy",
          };
        } catch (ocrError) {
          console.error("OCR error", ocrError);
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
      console.log(`    topRight: [${el.topRight[0]}, ${el.topRight[1]}],`);
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
    logReceiptDataForTesting,
  };
};
