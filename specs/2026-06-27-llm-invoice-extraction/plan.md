# LLM Invoice Extraction — Mobile Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a flag-gated path in the existing scan flow that calls the backend's `POST /api/invoices/scan` instead of on-device OCR + the rule engine, confined to `useScan.ts` plus one new service file, so the feature can be manually validated end-to-end on a real device.

**Architecture:** A new `invoiceExtractionService` (mirrors `documentsService` exactly) wraps the HTTP call. `useScan.ts` branches inside `scanDocument()`: when `useLlmExtraction` is true, it skips on-device OCR, calls the service, and maps the result into the existing `ReceiptInfo` shape so the review modal and save flow in `Expenses/Edit/index.tsx` need zero changes.

**Tech Stack:** React + TypeScript, Capacitor, axios, Vitest + Testing Library (existing).

## Global Constraints

- Branch: all work happens on `feat/llm-invoice-extraction` (already checked out). Never commit to `main`.
- Run `npm run test.unit` before every commit; do not commit on red.
- Confined scope: only `src/api/services/invoiceExtractionService.ts` (new) and `src/hooks/useScan.ts` (modified) carry behavior changes. `Expenses/Edit/index.tsx`, the review modal, and the save flow are untouched.
- The backend contract (already implemented per the sibling `paperwork` repo's plan) is the source of truth for response shape: `{ success, data: { fileLocation, extraction: { vendor, invoiceDate, currency, subtotal, vatBreakdown, vatAmount, total, lineItems }, confidence, validation: { warnings }, needsReview, meta } }`.
- VAT bucket mapping: `taxLow` = sum of `vatBreakdown` entries at `rate === 9`; `taxHigh` = sum at `rate === 21`. Matches the Dutch two-bucket fields the rest of the app already uses.
- Toggle pattern mirrors the existing `debugMode`/`useRuleEngine` convention exactly: env-driven default, exposed setter, no dedicated settings UI.
- On-device OCR (`Ocr.detectText`) is never called when `useLlmExtraction` is true — no redundant call-and-discard.
- Double image upload (once inside the backend endpoint, once again at expense-save time) is an accepted, already-decided trade-off — do not attempt to dedupe it in this plan.

---

### Task 1: Invoice extraction API service

**Files:**
- Create: `src/api/services/invoiceExtractionService.ts`
- Test: `src/__tests__/api/services/invoiceExtractionService.test.ts`

**Interfaces:**
- Produces: `InvoiceExtraction`, `VatBreakdownEntry`, `LineItem`, `InvoiceExtractionWarning`, `InvoiceScanResult` types, and the `InvoiceExtractionService` class with `scanInvoice(file: File): Promise<InvoiceScanResult>`, plus a default-exported singleton `invoiceExtractionService`. Task 2 (`useScan.ts`) imports the default export and the `InvoiceExtraction` type.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/api/services/invoiceExtractionService.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../api/axiosInstance", () => ({
  default: { post: vi.fn() },
}));

import axiosInstance from "../../../api/axiosInstance";
import { InvoiceExtractionService } from "../../../api/services/invoiceExtractionService";

const mockedPost = vi.mocked(axiosInstance.post);

describe("InvoiceExtractionService.scanInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts the file as multipart form-data to invoices/scan and returns the data payload", async () => {
    const data = {
      fileLocation: "org1/receipt.jpg",
      extraction: {
        vendor: "Albert Heijn",
        invoiceDate: "2026-06-18",
        currency: "EUR",
        subtotal: 18.45,
        vatBreakdown: [{ rate: 9, amount: 1.66 }],
        vatAmount: 1.66,
        total: 20.11,
        lineItems: [],
      },
      confidence: { overall: 0.91, fields: {} },
      validation: { warnings: [] },
      needsReview: false,
      meta: {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        latencyMs: 1200,
        tokensUsed: { input: 1000, output: 100 },
      },
    };
    mockedPost.mockResolvedValue({ data: { success: true, data } });

    const service = new InvoiceExtractionService(axiosInstance);
    const file = new File(["x"], "receipt.jpg", { type: "image/jpeg" });
    const result = await service.scanInvoice(file);

    expect(result).toEqual(data);
    expect(mockedPost).toHaveBeenCalledTimes(1);
    const [url, formData, config] = mockedPost.mock.calls[0];
    expect(url).toBe("invoices/scan");
    expect((formData as FormData).get("file")).toBe(file);
    expect(config).toEqual({
      headers: { "Content-Type": "multipart/form-data" },
    });
  });

  it("throws with the server message when the request fails with a response", async () => {
    mockedPost.mockRejectedValue({
      response: {
        data: { message: "LLM invoice extraction is not enabled" },
      },
    });

    const service = new InvoiceExtractionService(axiosInstance);
    const file = new File(["x"], "receipt.jpg", { type: "image/jpeg" });

    await expect(service.scanInvoice(file)).rejects.toThrow(
      "LLM invoice extraction is not enabled"
    );
  });

  it("throws a generic message when the error has no response data", async () => {
    mockedPost.mockRejectedValue(new Error("network down"));

    const service = new InvoiceExtractionService(axiosInstance);
    const file = new File(["x"], "receipt.jpg", { type: "image/jpeg" });

    await expect(service.scanInvoice(file)).rejects.toThrow(
      "Failed to scan invoice"
    );
  });

  it("throws the generic fallback message when the response succeeds but has no data payload", async () => {
    // Mirrors documentsService.uploadDocument's existing behavior: the
    // "invalid response" error thrown inside the try block is itself caught
    // by the same function's catch block, which has no .response property to
    // read a message from, so it falls back to the generic message below
    // rather than surfacing "Invoice scan response is invalid" verbatim.
    mockedPost.mockResolvedValue({ data: { success: true } });

    const service = new InvoiceExtractionService(axiosInstance);
    const file = new File(["x"], "receipt.jpg", { type: "image/jpeg" });

    await expect(service.scanInvoice(file)).rejects.toThrow(
      "Failed to scan invoice"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/api/services/invoiceExtractionService.test.ts`
Expected: FAIL — `Failed to resolve import "../../../api/services/invoiceExtractionService"`

- [ ] **Step 3: Write the implementation**

Create `src/api/services/invoiceExtractionService.ts`:

```ts
import { AxiosError, AxiosInstance } from "axios";
import { ApiError } from "../types";
import axiosInstance from "../axiosInstance";

export interface VatBreakdownEntry {
  rate: number;
  amount: number;
}

export interface LineItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  taxRate: number | null;
  lineTotal: number;
}

export interface InvoiceExtraction {
  vendor: string | null;
  invoiceDate: string | null;
  currency: string;
  subtotal: number | null;
  vatBreakdown: VatBreakdownEntry[];
  vatAmount: number | null;
  total: number;
  lineItems: LineItem[];
}

export interface InvoiceExtractionWarning {
  code: string;
  message: string;
  field?: string;
}

export interface InvoiceScanResult {
  fileLocation: string;
  extraction: InvoiceExtraction;
  confidence: { overall: number; fields: Record<string, number> };
  validation: { warnings: InvoiceExtractionWarning[] };
  needsReview: boolean;
  meta: {
    provider: string;
    model: string;
    latencyMs: number;
    tokensUsed: { input: number; output: number };
  };
}

interface InvoiceScanResponse {
  success: boolean;
  data?: InvoiceScanResult;
}

/**
 * InvoiceExtractionService: calls the backend LLM invoice/receipt extraction endpoint
 */
export class InvoiceExtractionService {
  private axios: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axios = axiosInstance;
  }

  /**
   * Send a scanned receipt/invoice image to the backend for LLM extraction
   * @param file - The scanned image file
   * @returns Promise with the extraction result
   */
  async scanInvoice(file: File): Promise<InvoiceScanResult> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const config = {
        headers: { "Content-Type": "multipart/form-data" },
      };

      const response = await this.axios.post<InvoiceScanResponse>(
        "invoices/scan",
        formData,
        config
      );

      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error("Invoice scan response is invalid");
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage =
        axiosError.response?.data?.message || "Failed to scan invoice";
      throw new Error(errorMessage);
    }
  }
}

// Create and export a default instance of InvoiceExtractionService
export const invoiceExtractionService = new InvoiceExtractionService(
  axiosInstance
);

export default invoiceExtractionService;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/api/services/invoiceExtractionService.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/api/services/invoiceExtractionService.ts src/__tests__/api/services/invoiceExtractionService.test.ts
git commit -m "feat: add invoiceExtractionService for the backend LLM scan endpoint"
```

---

### Task 2: Wire the LLM path into useScan

**Files:**
- Modify: `src/hooks/useScan.ts`
- Modify: `.env.example`
- Test: `src/__tests__/hooks/useScan.test.ts`

**Interfaces:**
- Consumes: `invoiceExtractionService` (default export) and `InvoiceExtraction` type from `../api/services/invoiceExtractionService` (Task 1).
- Produces: `useScan()` now also returns `useLlmExtraction: boolean` and `setUseLlmExtraction: (value: boolean) => void`. `ScanResult` gains an optional `extraction?: InvoiceExtraction` field and `parsingMethod` gains the `"llm"` variant. No change to any other field's name or type — `Expenses/Edit/index.tsx` keeps working unmodified.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/hooks/useScan.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("capacitor-document-scanner", () => ({
  DocumentScanner: { scanDocument: vi.fn() },
}));

vi.mock("../../api/services/invoiceExtractionService", () => ({
  default: { scanInvoice: vi.fn() },
}));

import { DocumentScanner } from "capacitor-document-scanner";
import invoiceExtractionService from "../../api/services/invoiceExtractionService";
import { useScan } from "../../hooks/useScan";

const mockedScanDocument = vi.mocked(DocumentScanner.scanDocument);
const mockedScanInvoice = vi.mocked(invoiceExtractionService.scanInvoice);

describe("useScan — LLM extraction path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedScanDocument.mockResolvedValue({
      scannedImages: ["/tmp/fake-scan.jpg"],
      status: "success" as never,
    });
    global.fetch = vi.fn().mockResolvedValue({
      blob: vi
        .fn()
        .mockResolvedValue(new Blob(["fake-image"], { type: "image/jpeg" })),
    } as unknown as Response);
  });

  it("calls invoiceExtractionService instead of on-device OCR when useLlmExtraction is true", async () => {
    mockedScanInvoice.mockResolvedValue({
      fileLocation: "org1/receipt.jpg",
      extraction: {
        vendor: "Albert Heijn",
        invoiceDate: "2026-06-18",
        currency: "EUR",
        subtotal: 18.45,
        vatBreakdown: [{ rate: 9, amount: 1.66 }],
        vatAmount: 1.66,
        total: 20.11,
        lineItems: [],
      },
      confidence: { overall: 0.91, fields: {} },
      validation: { warnings: [] },
      needsReview: false,
      meta: {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        latencyMs: 1200,
        tokensUsed: { input: 1000, output: 100 },
      },
    });

    const { result } = renderHook(() => useScan());

    act(() => {
      result.current.setUseLlmExtraction(true);
    });

    let scanResult;
    await act(async () => {
      scanResult = await result.current.scanDocument();
    });

    expect(mockedScanInvoice).toHaveBeenCalledTimes(1);
    expect(scanResult?.receiptInfo).toEqual({
      date: new Date("2026-06-18"),
      total: 20.11,
      taxLow: 1.66,
      taxHigh: 0,
    });
    expect(scanResult?.rawText).toEqual(["Albert Heijn"]);
    expect(scanResult?.parsingMethod).toBe("llm");
    expect(scanResult?.extraction?.vendor).toBe("Albert Heijn");
  });

  it("falls back to 'onbekend' and zero VAT buckets when the LLM returns nothing usable", async () => {
    mockedScanInvoice.mockResolvedValue({
      fileLocation: "org1/receipt.jpg",
      extraction: {
        vendor: null,
        invoiceDate: null,
        currency: "EUR",
        subtotal: null,
        vatBreakdown: [],
        vatAmount: null,
        total: 10,
        lineItems: [],
      },
      confidence: { overall: 0.5, fields: {} },
      validation: { warnings: [] },
      needsReview: true,
      meta: {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        latencyMs: 900,
        tokensUsed: { input: 80, output: 8 },
      },
    });

    const { result } = renderHook(() => useScan());
    act(() => {
      result.current.setUseLlmExtraction(true);
    });

    let scanResult;
    await act(async () => {
      scanResult = await result.current.scanDocument();
    });

    expect(scanResult?.rawText).toEqual(["onbekend"]);
    expect(scanResult?.receiptInfo?.taxLow).toBe(0);
    expect(scanResult?.receiptInfo?.taxHigh).toBe(0);
  });

  it("sets scanError and returns null when the LLM service call fails", async () => {
    mockedScanInvoice.mockRejectedValue(
      new Error("LLM invoice extraction is not enabled")
    );

    const { result } = renderHook(() => useScan());
    act(() => {
      result.current.setUseLlmExtraction(true);
    });

    let scanResult;
    await act(async () => {
      scanResult = await result.current.scanDocument();
    });

    expect(scanResult).toBeNull();
    expect(result.current.scanError).toBe(
      "Error detecting text. The image may be unclear or the server connection was lost."
    );
  });

  it("never calls invoiceExtractionService when useLlmExtraction is false (default)", async () => {
    const { result } = renderHook(() => useScan());
    expect(result.current.useLlmExtraction).toBe(false);

    // The default path calls the on-device OCR plugin, unmocked here, which
    // throws inside scanDocument's own try/catch and resolves to null — we
    // only assert the LLM branch was never reached, not the legacy path's
    // (unchanged, pre-existing) behavior.
    await act(async () => {
      await result.current.scanDocument();
    });

    expect(mockedScanInvoice).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/hooks/useScan.test.ts`
Expected: FAIL — `useScan` has no `useLlmExtraction`/`setUseLlmExtraction`, and `scanDocument` never calls `invoiceExtractionService`.

- [ ] **Step 3: Write the implementation**

Modify `src/hooks/useScan.ts` — full new file contents:

```ts
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

export interface ScanResult {
  imageUrl: string;
  imagePath: string;
  receiptInfo: ReceiptInfo | null;
  rawText: string[];
  rawTextElements?: TextElement[];
  parsingMethod?: "rule-engine" | "legacy" | "llm";
  extraction?: InvoiceExtraction;
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

        try {
          let extractedInfo: ReceiptInfo | null;
          let textElements: TextElement[] = [];
          let parsingMethod: ScanResult["parsingMethod"];
          let llmExtraction: InvoiceExtraction | undefined;

          if (useLlmExtraction) {
            const imageUrl = Capacitor.convertFileSrc(imagePath);
            const blob = await (await fetch(imageUrl)).blob();
            const file = new File([blob], "scan.jpg", { type: "image/jpeg" });

            const scanResult = await invoiceExtractionService.scanInvoice(
              file
            );
            llmExtraction = scanResult.extraction;

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
              .filter((entry) => entry.rate === 9)
              .reduce((sum, entry) => sum + entry.amount, 0);
            const taxHigh = scanResult.extraction.vatBreakdown
              .filter((entry) => entry.rate === 21)
              .reduce((sum, entry) => sum + entry.amount, 0);

            extractedInfo = {
              date: scanResult.extraction.invoiceDate
                ? new Date(scanResult.extraction.invoiceDate)
                : new Date(),
              total: scanResult.extraction.total,
              taxLow,
              taxHigh,
            };
            parsingMethod = "llm";
          } else {
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

          const rawText = useLlmExtraction
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
              const vendor = rawText[0] || "onbekend";
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
            rawText,
            rawTextElements: useLlmExtraction ? undefined : textElements,
            parsingMethod,
            extraction: llmExtraction,
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/hooks/useScan.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Add the new env var to `.env.example`**

Modify `.env.example`:

```
# API URL for the Paperwork backend service
# Note: In Vite, all env variables exposed to client must be prefixed with VITE_
VITE_PAPERWORK_API_URL=http://localhost:3000

# Set to "true" to use the backend LLM invoice/receipt extraction endpoint
# (POST /api/invoices/scan) instead of on-device OCR + the rules engine.
# Requires LLM_INVOICE_EXTRACTION_ENABLED=true on the backend.
VITE_APP_LLM_EXTRACTION_ENABLED=false
```

- [ ] **Step 6: Run the full unit suite to confirm nothing else broke**

Run: `npm run test.unit`
Expected: PASS (all existing suites still green, including every `receipt-parsing` and hook test).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useScan.ts src/__tests__/hooks/useScan.test.ts .env.example
git commit -m "feat: wire useScan to the backend LLM extraction endpoint behind a flag"
```

---

## Manual end-to-end validation (after both tasks)

1. On the backend (`paperwork` repo), set `LLM_INVOICE_EXTRACTION_ENABLED=true` and a real `ANTHROPIC_API_KEY` in `config/config.env`, and run the server.
2. In this repo, set `VITE_APP_LLM_EXTRACTION_ENABLED=true` in `.env` (or call `setUseLlmExtraction(true)` from a debug entry point), pointing `VITE_PAPERWORK_API_URL` at that backend.
3. Run the app on a real device or simulator, scan a real receipt, and confirm: the review modal pre-fills with the LLM's date/total/tax fields, the debug console shows the full extraction/confidence/warnings, and saving the expense succeeds through the unmodified save flow.
4. This is the manual validation the two feature branches (`paperwork` and `paperwork-app`, both `feat/llm-invoice-extraction`) are held open for — neither merges to `main` until this step is confirmed working.
