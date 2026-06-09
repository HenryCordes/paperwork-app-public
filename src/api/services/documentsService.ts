import { AxiosError, AxiosInstance } from "axios";
import { ApiError } from "../types";
import axiosInstance from "../axiosInstance";

/**
 * Response from document upload
 */
export interface DocumentUploadResponse {
  success: boolean;
  data: {
    fileLocation: string;
  };
}

/**
 * DocumentsService: Handles document-related operations
 */
export class DocumentsService {
  private axios: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axios = axiosInstance;
  }

  /**
   * Get the full URL for a document
   * @param filePath - The document file path
   * @returns The full URL to the document
   */
  getDocumentUrl(filePath: string): string {
    // Use the baseURL from axios instance and append the document path
    const baseUrl = this.axios.defaults.baseURL;
    if (!baseUrl) {
      throw new Error("API base URL not configured");
    }

    // Construct the full URL to the document
    return `${baseUrl}document/${filePath}`;
  }

  /**
   * Get the full api URL for a document
   * @param filePath - The document file path
   * @returns The full URL to the document
   */
  getApiDocumentUrl(filePath: string): string {
    // Use the baseURL from axios instance and append the document path
    const baseUrl = import.meta.env.VITE_PAPERWORK_API_URL;
    if (!baseUrl) {
      throw new Error("API base URL not configured");
    }

    // Construct the full URL to the document
    return `${baseUrl.replace(/\/api\/$/, "")}${filePath}`;
  }

  /**
   * Open the document in a new browser tab
   * @param filePath - The document file path
   */
  openDocument(filePath: string): void {
    const documentUrl = this.getApiDocumentUrl(filePath);
    window.open(documentUrl, "_blank");
  }

  /**
   * Upload a document file
   * @param file - The file to upload
   * @returns Promise with the document location
   */
  async uploadDocument(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const config = {
        headers: { "Content-Type": "multipart/form-data" },
      };

      const response = await this.axios.post<DocumentUploadResponse>(
        "document",
        formData,
        config
      );

      if (
        response.data &&
        response.data.success &&
        response.data.data.fileLocation
      ) {
        return "/api/document/" + response.data.data.fileLocation;
      } else {
        throw new Error("Document upload response is invalid");
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage =
        axiosError.response?.data?.message || "Failed to upload document";
      throw new Error(errorMessage);
    }
  }

  /**
   * Upload a document file
   * @param file - The file to upload
   * @returns Promise with the document location
   */
  async uploadReceiptDocument(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const config = {
        headers: { "Content-Type": "multipart/form-data" },
      };

      const response = await this.axios.post<DocumentUploadResponse>(
        "document",
        formData,
        config
      );

      if (
        response.data &&
        response.data.success &&
        response.data.data.fileLocation
      ) {
        return response.data.data.fileLocation;
      } else {
        throw new Error("Document upload response is invalid");
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage =
        axiosError.response?.data?.message || "Failed to upload document";
      throw new Error(errorMessage);
    }
  }
}

// Create and export a default instance of DocumentsService
export const documentsService = new DocumentsService(axiosInstance);

export default documentsService;
