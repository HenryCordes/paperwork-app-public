/**
 * API response and request types
 */

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  companyName: string;
  email: string;
  role: string;
  organization: string;
  createdAt: string;
  __v: number;
}

// Generic API error response
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Types for forgot password functionality
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  emailData: SendResetEmailRequest;
}

export interface SendResetEmailRequest {
  to: {
    email: string;
    name: string;
  };
  from: {
    email: string;
    name: string;
  };
  subject: string;
  html: string;
  resetToken: string;
  resetUrl: string;
  expiryDate: Date;
}

export interface SendResetEmailResponse {
  success: boolean;
}

export interface ResetPasswordRequest {
  email: string;
  resetToken: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}
