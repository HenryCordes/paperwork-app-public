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
        timeout: 30_000,
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
