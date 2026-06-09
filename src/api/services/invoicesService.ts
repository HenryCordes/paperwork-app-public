import {
  Invoice,
  InvoiceCreateUpdateRequest,
  InvoicesQueryParams,
  InvoicesResponse,
} from "../types/invoices";
import { AxiosError, AxiosInstance } from "axios";
import { ApiError } from "../types";
import axiosInstance from "../axiosInstance";

/**
 * InvoicesService: Handles invoices-related API calls
 */
export class InvoicesService {
  private axios: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axios = axiosInstance;
  }

  /**
   * Get a paginated list of invoices
   */
  async getInvoices(
    params: InvoicesQueryParams = {}
  ): Promise<InvoicesResponse> {
    try {
      const { offset = 0, limit = 10 } = params;
      const response = await this.axios.get(
        `/invoices?offset=${offset}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen facturen"
      );
    }
  }

  /**
   * Get a single invoice by its ID
   */
  async getInvoiceById(
    id: string
  ): Promise<{ success: boolean; data: Invoice }> {
    try {
      const response = await this.axios.get(`/invoice/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen factuur"
      );
    }
  }

  /**
   * Create a new invoice or update an existing one
   */
  async createOrUpdateInvoice(
    data: InvoiceCreateUpdateRequest
  ): Promise<{ success: boolean; data: Invoice }> {
    try {
      const response = await this.axios.post(`/invoice`, data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij opslaan factuur"
      );
    }
  }

  /**
   * Delete an invoice by its ID
   */
  async deleteInvoice(id: string): Promise<{ success: boolean }> {
    try {
      const response = await this.axios.delete(`/invoices/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij verwijderen factuur"
      );
    }
  }
}

// Create and export a default instance of InvoicesService
export const invoicesService = new InvoicesService(axiosInstance);

export default invoicesService;
