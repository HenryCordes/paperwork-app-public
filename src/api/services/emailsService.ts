import { AxiosError, AxiosInstance } from "axios";
import {
  EmailsResponse,
  EmailsQueryParams,
  EmailDetailResponse,
  EmailCreateUpdateRequest,
} from "../types/emails";
import { ApiError } from "../types";
import axiosInstance from "../axiosInstance";

/**
 * EmailsService: Handles emails-related API calls
 */
export class EmailsService {
  private axios: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axios = axiosInstance;
  }

  /**
   * Get list of emails with pagination
   * @param params - Query parameters for pagination
   * @returns Promise with emails response
   */
  async getEmails(
    params: EmailsQueryParams = { offset: 0, limit: 10 }
  ): Promise<EmailsResponse> {
    try {
      const response = await this.axios.get<EmailsResponse>("emails", {
        params,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen emails"
      );
    }
  }

  /**
   * Get detailed information for a specific email
   * @param id - Email ID
   * @returns Promise with email detail
   */
  async getEmailById(id?: string): Promise<EmailDetailResponse> {
    // Skip API call when id is 'create' or empty to prevent errors
    if (!id || id === "create") {
      throw new Error("Geen geldig email ID opgegeven");
    }

    try {
      const response = await this.axios.get<EmailDetailResponse>(`email/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen email details"
      );
    }
  }

  /**
   * Create or update an email
   * @param emailData - The email data to create or update (includes _id for updates)
   * @returns The created or updated email
   */
  async createOrUpdateEmail(
    emailData: EmailCreateUpdateRequest
  ): Promise<EmailDetailResponse> {
    try {
      const response = await this.axios.post<EmailDetailResponse>(
        "email",
        emailData
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const operation = emailData._id ? "bijwerken" : "aanmaken";
      throw new Error(
        axiosError.response?.data?.message || `Fout bij ${operation} email`
      );
    }
  }

  /**
   * Delete an email by ID
   * @param id - Email ID to delete
   * @returns Promise with success status
   */
  async deleteEmail(id: string): Promise<{ success: boolean }> {
    try {
      await this.axios.delete(`/email/${id}`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij verwijderen email"
      );
    }
  }

  /**
   * Send an email
   * @param email - Email data to send
   * @returns Promise with email response
   */
  async useSendEmail(
    email: EmailCreateUpdateRequest
  ): Promise<EmailDetailResponse> {
    try {
      const response = await this.axios.post<EmailDetailResponse>(
        "/email/send",
        email
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij verzenden email"
      );
    }
  }
}

// Create and export a default instance of EmailsService
export const emailsService = new EmailsService(axiosInstance);

export default emailsService;
