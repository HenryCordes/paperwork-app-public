import { useCallback, useEffect, useState } from "react";
import { App, AppState } from "@capacitor/app";
import { PluginListenerHandle } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { useBiometrics } from "./biometrics/useBiometrics";
import { useIonRouter, isPlatform } from "@ionic/react";
import { useAuth } from "./useAuth";
import { DEFAULT_SESSION_TIMEOUT } from "../common/versionConstants";
import { getBiometricName } from "../utils/bioMetricUtils";
import { BiometricType } from "./biometrics/biometrics.types";

const LAST_ACTIVE_KEY = "last_active_timestamp";
const RECENT_LOGOUT_KEY = "recent_logout";
const SESSION_TIMEOUT_KEY = "session_timeout_minutes";
const AUTH_IN_PROGRESS_KEY = "auth_in_progress";

export const useSessionManager = () => {
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(
    DEFAULT_SESSION_TIMEOUT
  );
  const {
    isBiometricsEnabled,
    authenticate,
    getCredentials,
    checkAvailability,
  } = useBiometrics();
  const ionRouter = useIonRouter();
  const { login } = useAuth();

  // Load session timeout setting
  useEffect(() => {
    const loadSessionTimeout = async () => {
      try {
        let result;
        try {
          result = await SecureStoragePlugin.get({ key: SESSION_TIMEOUT_KEY });
        } catch {
          console.log(
            "[useSessionManager] No session timeout set, using default"
          );
          // Create the key with default value for first-time users
          await SecureStoragePlugin.set({
            key: SESSION_TIMEOUT_KEY,
            value: DEFAULT_SESSION_TIMEOUT.toString(),
          });
          result = { value: DEFAULT_SESSION_TIMEOUT.toString() };
        }
        setSessionTimeoutMinutes(parseInt(result.value, 10));
      } catch {
        // If value doesn't exist, use default
        console.log("Using default session timeout");
      }
    };
    loadSessionTimeout();
  }, []);

  // Save the current timestamp as last active
  const updateLastActive = useCallback(async () => {
    const now = Date.now();
    await SecureStoragePlugin.set({
      key: LAST_ACTIVE_KEY,
      value: now.toString(),
    });
  }, []);

  // Check if the session has timed out
  const checkSessionTimeout = useCallback(async () => {
    try {
      const result = await SecureStoragePlugin.get({ key: LAST_ACTIVE_KEY });
      const lastActive = parseInt(result.value, 10);
      const now = Date.now();
      const timeoutMs = sessionTimeoutMinutes * 60 * 1000;
      return now - lastActive > timeoutMs;
    } catch {
      // If no last active timestamp, consider not timed out
      return false;
    }
  }, [sessionTimeoutMinutes]);

  // Save session timeout setting
  const saveSessionTimeout = useCallback(async (minutes: number) => {
    await SecureStoragePlugin.set({
      key: SESSION_TIMEOUT_KEY,
      value: minutes.toString(),
    });
    setSessionTimeoutMinutes(minutes);
  }, []);

  const setAuthInProgress = useCallback(async (inProgress: boolean) => {
    try {
      await SecureStoragePlugin.set({
        key: AUTH_IN_PROGRESS_KEY,
        value: inProgress.toString(),
      });
    } catch (error) {
      console.error("[SessionManager] Error setting auth in progress:", error);
    }
  }, []);

  const checkAuthInProgress = useCallback(async () => {
    try {
      const result = await SecureStoragePlugin.get({
        key: AUTH_IN_PROGRESS_KEY,
      });
      if (result.value === "true") {
        console.log(
          "[SessionManager] Authentication already in progress, skipping"
        );
        return true;
      }
    } catch {
      // Key doesn't exist, auth is not in progress
    }
    return false;
  }, []);

  const handleBiometricAuth = useCallback(async () => {
    console.log("[SessionManager] Checking if biometric auth is needed");

    // Check if auth is already in progress
    const isAuthInProgress = await checkAuthInProgress();
    if (isAuthInProgress) {
      return;
    }

    // Set auth in progress flag
    await setAuthInProgress(true);

    if (isPlatform("android")) {
      console.log(
        "[SessionManager] Android detected, skipping automatic biometric auth"
      );
      return;
    }

    try {
      const recentLogoutValue = await SecureStoragePlugin.get({
        key: RECENT_LOGOUT_KEY,
      });
      if (recentLogoutValue.value === "true") {
        console.log(
          "[SessionManager] Recent logout detected, skipping auto biometric auth"
        );
        return;
      }
    } catch {
      console.log("[SessionManager] No recent logout flag, continuing");
    }

    // Check if biometrics is enabled
    const biometricsEnabled = await isBiometricsEnabled();
    if (!biometricsEnabled) {
      console.log("[SessionManager] Biometrics not enabled, skipping");
      return;
    }

    // Verify credentials exist
    const credentials = await getCredentials();
    if (!credentials) {
      console.log(
        "[SessionManager] No stored credentials, skipping biometric auth"
      );
      return;
    }

    console.log(
      "[SessionManager] Triggering biometric auth after timeout/resume"
    );
    const availability = await checkAvailability();
    console.log("[SessionManager] Biometric availability:", availability);

    const authenticated = await authenticate({
      reason: "Verifieer je identiteit om door te gaan",
      title: `${getBiometricName(
        availability.biometryType || BiometricType.NONE,
        true
      )} login`,
      subtitle: `Login met ${getBiometricName(
        availability.biometryType || BiometricType.NONE
      )}`,
      allowDeviceCredential: true,
    });

    if (authenticated) {
      console.log("[SessionManager] Biometric auth successful");

      // Clear auth in progress flag
      await setAuthInProgress(false);

      try {
        // Clear recent logout flag on successful auth
        await SecureStoragePlugin.remove({ key: RECENT_LOGOUT_KEY });
        console.log("[SessionManager] Cleared recent logout flag");
      } catch {
        // Key might not exist on first install - that's fine
        console.log("[SessionManager] No recent logout flag to clear");
      }

      // Attempt login with stored credentials
      try {
        await login.mutateAsync({
          email: credentials.username,
          password: credentials.password,
        });

        // Update last active timestamp after successful auth
        await updateLastActive();
      } catch (error) {
        console.error("[SessionManager] Error during automatic login:", error);
      }
    } else {
      console.log("[SessionManager] Biometric auth failed or canceled");
      ionRouter.push("/login", "root");

      // Clear auth in progress flag
      await setAuthInProgress(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: checkAuthInProgress, checkAvailability, and setAuthInProgress are stable callbacks defined in this hook; adding them would cause infinite re-renders
  }, [
    isBiometricsEnabled,
    authenticate,
    getCredentials,
    updateLastActive,
    ionRouter,
    login,
  ]);

  // Check session on app resume
  useEffect(() => {
    const handleAppStateChange = async ({ isActive }: AppState) => {
      if (isActive) {
        console.log("[SessionManager] App became active, checking session");
        const hasTimedOut = await checkSessionTimeout();
        if (hasTimedOut) {
          console.log(
            "[SessionManager] Session timed out, requiring authentication"
          );

          if (isPlatform("android")) {
            console.log(
              "[SessionManager] Android detected, skipping biometric auth"
            );
          } else {
            handleBiometricAuth();
          }
        } else {
          updateLastActive();
        }
      } else {
        // App going to background, save current timestamp
        console.log(
          "[SessionManager] App going to background, saving timestamp"
        );
        updateLastActive();
      }
    };

    // Subscribe to app state changes
    let appStateListener: PluginListenerHandle | undefined;

    App.addListener("appStateChange", handleAppStateChange).then((listener) => {
      appStateListener = listener;
    });

    // Initial check when component mounts
    const initialCheck = async () => {
      const hasTimedOut = await checkSessionTimeout();
      if (hasTimedOut) {
        console.log("[SessionManager] Initial check: session timed out");

        if (isPlatform("android")) {
          console.log(
            "[SessionManager] Android detected, skipping biometric auth"
          );
        } else {
          handleBiometricAuth();
        }
      } else {
        updateLastActive();
      }
    };
    initialCheck();

    return () => {
      // Clean up listener when component unmounts
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [checkSessionTimeout, handleBiometricAuth, updateLastActive]);

  // Clear auth in progress flag when component mounts
  useEffect(() => {
    const clearAuthFlag = async () => {
      try {
        await SecureStoragePlugin.remove({ key: AUTH_IN_PROGRESS_KEY });
      } catch {
        // Key might not exist - that's fine
      }
    };
    clearAuthFlag();
  }, []);

  return {
    sessionTimeoutMinutes,
    saveSessionTimeout,
    updateLastActive,
  };
};
