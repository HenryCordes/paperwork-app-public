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
      timeout: 30_000,
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

  it("sets a request timeout so a hung connection does not hang forever", async () => {
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
    await service.scanInvoice(file);

    expect(mockedPost).toHaveBeenCalledWith(
      "invoices/scan",
      expect.anything(),
      expect.objectContaining({ timeout: 30_000 })
    );
  });
});
