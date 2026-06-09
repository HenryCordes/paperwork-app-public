import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import authService from "../api/services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  checkAuthentication: () => boolean;
  setAuthenticated: (value: boolean) => void;
  requiresManualLogin: boolean;
}

// Provide default values to avoid the need for null checks
const defaultAuthContext: AuthContextType = {
  isAuthenticated: false,
  checkAuthentication: () => false,
  setAuthenticated: () => {},
  requiresManualLogin: true,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Initial state based on localStorage
    const initialAuth = authService.isAuthenticated();
    return initialAuth;
  });

  const [requiresManualLogin] = useState<boolean>(true);

  // Function to check current authentication status
  const checkAuthentication = useCallback((): boolean => {
    const status = authService.isAuthenticated();
    if (isAuthenticated !== status) {
      // Update state if different from current value
      setIsAuthenticated(status);
    }
    return status;
  }, [isAuthenticated]);

  // Update auth state
  const setAuthenticated = (value: boolean): void => {
    setIsAuthenticated(value);
  };

  // Check authentication status on mount
  useEffect(() => {
    // Check authentication status once on component mount
    checkAuthentication();
  }, [checkAuthentication]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      checkAuthentication,
      setAuthenticated,
      requiresManualLogin,
    }),
    [isAuthenticated, checkAuthentication, requiresManualLogin]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  return context;
};

export default AuthContext;
