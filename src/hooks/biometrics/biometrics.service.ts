import {
  AndroidBiometryStrength,
  BiometricAuth,
  BiometryError,
  BiometryType as PluginBiometryType,
  BiometryErrorType,
} from "@aparajita/capacitor-biometric-auth";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { isPlatform } from "@ionic/react";
import {
  BiometricAuthOptions,
  BiometricAvailability,
  BiometricCredentials,
  BiometricType,
} from "./biometrics.types";

// Map between plugin's biometry types and our app's biometric types
const pluginToAppBiometryTypeMap: Record<number, BiometricType> = {
  [PluginBiometryType.none]: BiometricType.NONE,
  [PluginBiometryType.touchId]: BiometricType.FINGERPRINT,
  [PluginBiometryType.faceId]: BiometricType.FACE,
  [PluginBiometryType.fingerprintAuthentication]: BiometricType.FINGERPRINT,
  [PluginBiometryType.faceAuthentication]: BiometricType.FACE,
  [PluginBiometryType.irisAuthentication]: BiometricType.IRIS,
};

const BIOMETRICS_ENABLED_KEY = "biometrics_enabled";
const BIOMETRICS_CREDENTIALS_SERVER = "nl.paperwork.app.auth";


export class BiometricsService {

  async checkAvailability(): Promise<BiometricAvailability> {
    try {
      const result = await BiometricAuth.checkBiometry();

      // Map plugin's biometry type to our internal type
      const biometryType =
        result.biometryType !== undefined
          ? pluginToAppBiometryTypeMap[result.biometryType] ||
            BiometricType.NONE
          : BiometricType.NONE;

      return {
        isAvailable: result.isAvailable,
        biometryType: biometryType,
        canUseFaceID:
          result.biometryType === PluginBiometryType.faceId ||
          result.biometryType === PluginBiometryType.faceAuthentication,
        canUseFingerprint:
          result.biometryType === PluginBiometryType.touchId ||
          result.biometryType === PluginBiometryType.fingerprintAuthentication,
        canUseIris:
          result.biometryType === PluginBiometryType.irisAuthentication,
      };
    } catch (error) {
      return {
        isAvailable: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async authenticate(options: BiometricAuthOptions): Promise<boolean> {
    try {
      // Simple authentication flow with consistent options
      await BiometricAuth.authenticate({
        reason: options.reason,
        cancelTitle: options.cancelTitle,
        allowDeviceCredential: options.allowDeviceCredential ?? true,
        androidTitle: options.title,
        androidSubtitle: options.subtitle,
        androidConfirmationRequired: true,
        androidBiometryStrength: AndroidBiometryStrength.strong,
      });

      console.log("[BiometricsService] Biometric authentication successful");
      return true;
    } catch (error) {
      if (error instanceof BiometryError) {
        if (error.code === BiometryErrorType.userCancel) {
          console.log(
            "[BiometricsService] User cancelled biometric authentication"
          );
          return false;
        } else if (error.code === BiometryErrorType.systemCancel) {
          // Log but don't fail authentication on systemCancel - this allows iOS to retry
          console.log(
            `[BiometricsService] System canceled biometric authentication: ${error.code}`
          );
          // Return false on Android but continue on iOS
          if (isPlatform("android")) {
            return false;
          }
        } else if (error.code === BiometryErrorType.biometryLockout) {
          console.error(
            "[BiometricsService] Biometric authentication lockout:",
            error.message
          );
        } else if (error.code === BiometryErrorType.authenticationFailed) {
          console.error(
            "[BiometricsService] Authentication failed:",
            error.message
          );
        } else {
          console.error(
            "[BiometricsService] Biometric authentication error:",
            error.code,
            error.message
          );
        }
      } else {
        console.error(
          "[BiometricsService] Unexpected error during biometric authentication:",
          error
        );
      }
      return false;
    }
  }

  async saveCredentials(credentials: BiometricCredentials): Promise<boolean> {
    try {
      console.log(
        "[BiometricsService] Saving credentials for user:",
        credentials.username
      );

      // Store username securely
      await SecureStoragePlugin.set({
        key: `${BIOMETRICS_CREDENTIALS_SERVER}_username`,
        value: credentials.username,
      });

      console.log("[BiometricsService] Username stored securely");

      // Store password securely
      await SecureStoragePlugin.set({
        key: `${BIOMETRICS_CREDENTIALS_SERVER}_password`,
        value: credentials.password,
      });

      console.log("[BiometricsService] Password stored securely");

      return true;
    } catch (error) {
      console.error("[BiometricsService] Error saving credentials:", error);
      return false;
    }
  }

  async clearCredentials(): Promise<void> {
    try {
      try {
        await SecureStoragePlugin.remove({
          key: `${BIOMETRICS_CREDENTIALS_SERVER}_username`,
        });
      } catch {
        console.log("[BiometricsService] No username credential to clear");
      }

      try {
        await SecureStoragePlugin.remove({
          key: `${BIOMETRICS_CREDENTIALS_SERVER}_password`,
        });
      } catch {
        console.log("[BiometricsService] No password credential to clear");
      }

      console.log(
        "[BiometricsService] Successfully cleared biometric credentials"
      );
    } catch (error) {
      console.error("[BiometricsService] Error clearing credentials:", error);
    }
  }

  async getCredentials(): Promise<BiometricCredentials | null> {
    try {
      console.log("[BiometricsService] Attempting to retrieve credentials");

      let username, password;

      try {
        const usernameResult = await SecureStoragePlugin.get({
          key: `${BIOMETRICS_CREDENTIALS_SERVER}_username`,
        });
        username = usernameResult.value;
        console.log("[BiometricsService] Username found in secure storage");
      } catch {
        console.log("[BiometricsService] Username not found in secure storage");
        username = null;
      }

      try {
        const passwordResult = await SecureStoragePlugin.get({
          key: `${BIOMETRICS_CREDENTIALS_SERVER}_password`,
        });
        password = passwordResult.value;
        console.log("[BiometricsService] Password found in secure storage");
      } catch {
        console.log("[BiometricsService] Password not found in secure storage");
        password = null;
      }

      if (!username || !password) {
        console.log(
          "[BiometricsService] Missing credentials - can't use biometric login"
        );
        return null;
      }

      return {
        username,
        password,
        server: BIOMETRICS_CREDENTIALS_SERVER,
      };
    } catch (error) {
      console.error("[BiometricsService] Error retrieving credentials:", error);
      return null;
    }
  }

  // Note: This method exists for backward compatibility, functionality is identical to clearCredentials
  async deleteCredentials(): Promise<boolean> {
    await this.clearCredentials();
    return true;
  }

  async isBiometricsEnabled(): Promise<boolean> {
    try {
      const result = await SecureStoragePlugin.get({
        key: BIOMETRICS_ENABLED_KEY,
      });
      return result.value === "true";
    } catch {
      console.log("[BiometricsService] Biometrics not enabled or first run");
      return false;
    }
  }

  async setBiometricsEnabled(enabled: boolean): Promise<void> {
    await SecureStoragePlugin.set({
      key: BIOMETRICS_ENABLED_KEY,
      value: enabled ? "true" : "false",
    });
    console.log(
      `[BiometricsService] Biometrics ${enabled ? "enabled" : "disabled"}`
    );
  }

  async getBiometricType(): Promise<BiometricType> {
    const availability = await this.checkAvailability();
    return availability.biometryType || BiometricType.NONE;
  }
}
