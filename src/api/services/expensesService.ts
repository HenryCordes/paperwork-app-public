import { AxiosError, AxiosInstance } from "axios";
import {
  ExpensesResponse,
  ExpensesQueryParams,
  ExpenseDetailResponse,
  ExpenseCreateUpdateRequest,
} from "../types/expenses";
import { ApiError } from "../types";
import axiosInstance from "../axiosInstance";

/**
 * ExpensesService: Handles expenses-related API calls
 */
export class ExpensesService {
  private axios: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axios = axiosInstance;
  }

  /**
   * Get list of expenses with pagination
   * @param params - Query parameters for pagination
   * @returns Promise with expenses response
   */
  async getExpenses(
    params: ExpensesQueryParams = { offset: 0, limit: 10 }
  ): Promise<ExpensesResponse> {
    try {
      const response = await this.axios.get<ExpensesResponse>("expenses", {
        params,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen kosten"
      );
    }
  }

  /**
   * Get detailed information for a specific expense
   * @param id - Expense ID
   * @returns Promise with expense detail
   */
  async getExpenseById(id?: string): Promise<ExpenseDetailResponse> {
    // Skip API call when id is 'create' or empty to prevent errors
    if (!id || id === "create") {
      throw new Error("Geen geldig kosten ID opgegeven");
    }

    try {
      const response = await this.axios.get<ExpenseDetailResponse>(
        `expense/${id}`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen kosten details"
      );
    }
  }

  /**
   * Create or update an expense
   * @param expenseData - The expense data to create or update (includes _id for updates)
   * @returns The created or updated expense
   */
  async createOrUpdateExpense(
    expenseData: ExpenseCreateUpdateRequest
  ): Promise<ExpenseDetailResponse> {
    try {
      const response = await this.axios.post<ExpenseDetailResponse>(
        "expense",
        expenseData
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const operation = expenseData._id ? "bijwerken" : "aanmaken";
      throw new Error(
        axiosError.response?.data?.message || `Fout bij ${operation} kosten`
      );
    }
  }

  /**
   * Delete an expense by ID
   * @param id - Expense ID to delete
   * @returns Promise with success status
   */
  async deleteExpense(id: string): Promise<{ success: boolean }> {
    try {
      await this.axios.delete(`/expense/${id}`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij verwijderen kosten"
      );
    }
  }

  // Document-related functionality has been moved to documentService
}

// Create and export a default instance of ExpensesService
export const expensesService = new ExpensesService(axiosInstance);

export default expensesService;
