import { useMutation } from "@tanstack/react-query";
import { authService } from "../api/services/authService";
import {
  ForgotPasswordRequest,
  SendResetEmailRequest,
  ResetPasswordRequest,
} from "../api/types";

/**
 * Hook for password reset functionality
 */
export const usePasswordReset = () => {
  // Request password reset
  const forgotPassword = useMutation({
    mutationFn: (data: ForgotPasswordRequest) =>
      authService.forgotPassword(data),
  });

  // Send reset email
  const sendResetEmail = useMutation({
    mutationFn: (data: SendResetEmailRequest) =>
      authService.sendResetEmail(data),
  });

  // Reset password
  const resetPassword = useMutation({
    mutationFn: (data: ResetPasswordRequest) => authService.resetPassword(data),
  });

  return {
    forgotPassword,
    sendResetEmail,
    resetPassword,
  };
};

export default usePasswordReset;
