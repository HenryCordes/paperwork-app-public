import {
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { LoginRequest, LoginResponse, User } from "../api/types";
import authService from "../api/services/authService";
import QueryKeys from "../api/queryKeys";
import { useAuthContext } from "../contexts/AuthContext";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

/**
 * React Query hook for handling authentication
 * Now uses centralized AuthContext to prevent circular redirects
 */
export const useAuth = () => {
  const queryClient = useQueryClient();
  const authContext = useAuthContext();

  /**
   * Login mutation using React Query
   */
  const login: UseMutationResult<LoginResponse, Error, LoginRequest> =
    useMutation({
      mutationFn: (credentials: LoginRequest) => authService.login(credentials),
      onSuccess: (data) => {
        authContext.setAuthenticated(true);

        queryClient.invalidateQueries({ queryKey: QueryKeys.auth.base });
        queryClient.setQueryData(QueryKeys.auth.user(), data.user);
      },
      onError: (error) => {
        console.error("[useAuth] [login] Login error:", error);
      },
    });

  const logout = async () => {
    authService.logout();

    // We intentionally don't clear biometric credentials on logout
    // But we set a flag to prevent automatic biometric login right after logout
    await SecureStoragePlugin.set({
      key: "recent_logout",
      value: "true",
    });
    console.log(
      "[useAuth] Set recent_logout flag to prevent automatic biometric login"
    );

    authContext.setAuthenticated(false);

    queryClient.invalidateQueries({ queryKey: QueryKeys.auth.base });
    queryClient.invalidateQueries({ queryKey: QueryKeys.expenses.base });
    queryClient.removeQueries({ queryKey: QueryKeys.auth.user() });
  };

  /**
   * Check if user is authenticated based on state
   * Uses the centralized AuthContext state
   * @returns {boolean} True if authenticated based on state
   */
  const isAuthenticated = () => {
    return authContext.isAuthenticated;
  };

  /**
   * Actively check authentication status
   * This performs a real-time verification of token validity
   * @returns {boolean} True if token is currently valid
   */
  const checkAuthentication = () => {
    return authContext.checkAuthentication();
  };

  /**
   * Get current user data from cache
   */
  const getCurrentUser = () => {
    return queryClient.getQueryData<User>(QueryKeys.auth.user());
  };

  return {
    login,
    logout,
    isAuthenticated,
    checkAuthentication,
    getCurrentUser,
  };
};

export default useAuth;
