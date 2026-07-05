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
import {
  useScan,
  ScanResult,
  parseExtractedInvoiceDate,
  buildReceiptFileName,
} from "../../hooks/useScan";

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

    let scanResult: ScanResult | null = null;
    await act(async () => {
      scanResult = await result.current.scanDocument();
    });

    expect(mockedScanInvoice).toHaveBeenCalledTimes(1);
    expect((scanResult as ScanResult | null)?.receiptInfo).toEqual({
      date: new Date("2026-06-18"),
      total: 20.11,
      taxLow: 1.66,
      taxHigh: 0,
    });
    expect((scanResult as ScanResult | null)?.rawText).toEqual([
      "Albert Heijn",
    ]);
    expect((scanResult as ScanResult | null)?.parsingMethod).toBe("llm");
    expect((scanResult as ScanResult | null)?.extraction?.vendor).toBe(
      "Albert Heijn",
    );
    expect((scanResult as ScanResult | null)?.fileLocation).toBe(
      "org1/receipt.jpg",
    );
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

    let scanResult: ScanResult | null = null;
    await act(async () => {
      scanResult = await result.current.scanDocument();
    });

    expect((scanResult as ScanResult | null)?.rawText).toEqual(["onbekend"]);
    expect((scanResult as ScanResult | null)?.receiptInfo?.taxLow).toBe(0);
    expect((scanResult as ScanResult | null)?.receiptInfo?.taxHigh).toBe(0);
  });

  it("falls back to on-device OCR when the LLM call fails, using the already-scanned image", async () => {
    mockedScanInvoice.mockRejectedValue(new Error("LLM provider error"));

    const { result } = renderHook(() => useScan());
    await act(async () => {
      result.current.setUseLlmExtraction(true);
    });

    let scanResult: ScanResult | null = null;
    await act(async () => {
      scanResult = await result.current.scanDocument();
    });

    // The on-device OCR plugin isn't implemented on the test/web platform,
    // so it throws too - but the key assertion is that the LLM failure did
    // NOT short-circuit straight to scanError; mockedScanInvoice fired and
    // mockedScanDocument fired (the OCR plugin attempt is implicit via the
    // resulting OCR-flavored error message, since Ocr.detectText throws
    // CapacitorException "not implemented on web" in this test environment).
    expect(mockedScanInvoice).toHaveBeenCalledTimes(1);
    expect(scanResult).toBeNull();
    expect(result.current.scanError).toBe(
      "Error detecting text. The image may be unclear or the server connection was lost."
    );
  });

  it("warns in debug mode when a VAT entry doesn't match the known Dutch rates", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockedScanInvoice.mockResolvedValue({
      fileLocation: "tenant/file.jpg",
      extraction: {
        vendor: "Foreign Co",
        invoiceDate: "2026-06-18",
        currency: "EUR",
        subtotal: 100,
        vatBreakdown: [{ rate: 19, amount: 19 }],
        vatAmount: 19,
        total: 119,
        lineItems: [],
      },
      confidence: { overall: 0.9, fields: {} },
      validation: { warnings: [] },
      needsReview: false,
      meta: {
        provider: "anthropic",
        model: "x",
        latencyMs: 1,
        tokensUsed: { input: 1, output: 1 },
      },
    });

    const { result } = renderHook(() => useScan());
    await act(async () => {
      result.current.setUseLlmExtraction(true);
      result.current.setDebugMode(true);
    });

    await act(async () => {
      await result.current.scanDocument();
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("==BON=="),
      expect.stringContaining("19"),
    );
    warnSpy.mockRestore();
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

describe("parseExtractedInvoiceDate", () => {
  it("parses a valid YYYY-MM-DD string", () => {
    const result = parseExtractedInvoiceDate("2026-06-18");
    expect(result.toISOString().split("T")[0]).toBe("2026-06-18");
  });

  it("returns today for null", () => {
    const before = Date.now();
    const result = parseExtractedInvoiceDate(null);
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("returns today for an unparseable string instead of an Invalid Date", () => {
    const result = parseExtractedInvoiceDate("not-a-date");
    expect(Number.isNaN(result.getTime())).toBe(false);
  });
});

describe("buildReceiptFileName", () => {
  it("sanitizes the vendor name and formats the date as YYYYMMDD", () => {
    const fileName = buildReceiptFileName(
      "Albert Heijn!",
      new Date("2026-06-18T12:00:00.000Z"),
    );
    expect(fileName).toMatch(/^bon_albert_heijn_20260618_\d+\.jpg$/);
  });

  it("falls back to 'onbekend' when vendor is null or empty", () => {
    const fileName = buildReceiptFileName(null, new Date("2026-06-18T12:00:00.000Z"));
    expect(fileName).toMatch(/^bon_onbekend_20260618_\d+\.jpg$/);
  });

  it("falls back to today's date when date is null", () => {
    const fileName = buildReceiptFileName("Foo", null);
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
    expect(fileName).toContain(`_${today}_`);
  });

  it("truncates a very long vendor name to 30 characters", () => {
    const longVendor = "A".repeat(50);
    const fileName = buildReceiptFileName(longVendor, new Date("2026-06-18T12:00:00.000Z"));
    const sanitizedPart = fileName.replace(/^bon_/, "").split("_2026")[0];
    expect(sanitizedPart.length).toBeLessThanOrEqual(30);
  });
});
