import { AxiosError, AxiosInstance } from "axios";
import {
  LoginRequest,
  LoginResponse,
  ApiError,
  UserProfile,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SendResetEmailRequest,
  SendResetEmailResponse,
} from "../types";
import axiosInstance from "../axiosInstance";

/**
 * AuthService: Handles authentication-related API calls
 */
export class AuthService {
  private axios: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axios = axiosInstance;
  }

  /**
   * Login with email and password
   * @param credentials - Login credentials
   * @returns Promise with login response
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.axios.post<LoginResponse>(
        "auth/login",
        credentials
      );

      // Store token in localStorage for future requests
      if (response.data.token) {
        try {
          localStorage.setItem("authToken", response.data.token);
        } catch (storageError) {
          console.error("[AuthService] Error storing token:", storageError);
        }
      } else {
        console.warn("[AuthService] No token received in login response");
      }

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage =
        axiosError.response?.data?.message || "Login mislukt";
      throw new Error(errorMessage);
    }
  }

  /**
   * Logout user by removing the token
   */
  logout(): void {
    try {
      localStorage.removeItem("authToken");
    } catch (e) {
      console.error("[AuthService] Error removing token:", e);
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if valid token exists
   */
  isAuthenticated(): boolean {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        return false;
      }
      
      // Additional validation could check token expiration
      // if using JWT format tokens
      // For now, we'll rely on the axios interceptor to handle invalid tokens
      
      return true;
    } catch (e) {
      console.error("[AuthService] Error checking authentication:", e);
      return false;
    }
  }

  /**
   * Get user profile information
   * @returns Promise with user profile data
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await this.axios.get<{
        success: boolean;
        data: UserProfile;
      }>("auth/profile");
      return response.data.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage =
        axiosError.response?.data?.message ||
        "Kon profielgegevens niet ophalen";
      throw new Error(errorMessage);
    }
  }

  /**
   * Request a password reset for an email address
   * @param data - Email address
   * @returns Promise with forgot password response containing email data
   */
  async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<ForgotPasswordResponse> {
    try {
      const response = await this.axios.post<ForgotPasswordResponse>(
        "auth/forgot-password",
        data
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage =
        axiosError.response?.data?.message || "Wachtwoord reset mislukt";
      throw new Error(errorMessage);
    }
  }

  /**
   * Send reset email with token
   * @param data - Email data with reset token
   * @returns Promise with send reset email response
   */
  async sendResetEmail(
    data: SendResetEmailRequest
  ): Promise<SendResetEmailResponse> {
    try {
      const response = await this.axios.post<SendResetEmailResponse>(
        "auth/send-reset-email",
        data
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage =
        axiosError.response?.data?.message || "Kon geen reset e-mail versturen";
      throw new Error(errorMessage);
    }
  }

  /**
   * Reset password with token and new password
   * @param data - Reset password data
   * @returns Promise with reset password response
   */
  async resetPassword(
    data: ResetPasswordRequest
  ): Promise<ResetPasswordResponse> {
    try {
      const response = await this.axios.post<ResetPasswordResponse>(
        "auth/reset-password",
        data
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage =
        axiosError.response?.data?.message || "Kon wachtwoord niet wijzigen";
      throw new Error(errorMessage);
    }
  }
}

// Create and export a default instance of AuthService
export const authService = new AuthService(axiosInstance);

export default authService;
