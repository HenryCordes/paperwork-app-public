import React, { useCallback, useEffect, useState } from "react";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  isPlatform,
} from "@ionic/react";
import { fingerPrintOutline, scanOutline, keyOutline } from "ionicons/icons";
import { useBiometrics } from "../../hooks/biometrics/useBiometrics";
import { BiometricType } from "../../hooks/biometrics/biometrics.types";
import { getBiometricName } from "../../utils/bioMetricUtils";

interface BiometricLoginProps {
  onLoginSuccess: (username: string, password: string) => void;
  onCancel: () => void;
  autoPrompt?: boolean; // Controls whether biometric auth should be triggered automatically
}

export const BiometricLogin: React.FC<BiometricLoginProps> = ({
  onLoginSuccess,
  onCancel,
  autoPrompt = true, // Default to true for backward compatibility
}) => {
  const {
    authenticate,
    checkAvailability,
    getCredentials,
    isBiometricsEnabled,
  } = useBiometrics();
  const [biometryType, setBiometryType] = useState<BiometricType>(
    BiometricType.NONE
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  // Check if biometrics is available and enabled
  useEffect(() => {
    const checkBiometricStatus = async () => {
      setLoading(true);
      try {
        // Check if user has enabled biometrics
        const enabled = await isBiometricsEnabled();
        if (!enabled) {
          setLoading(false);
          onCancel();
          return;
        }

        // Check if biometrics is available on this device
        const availability = await checkAvailability();
        if (!availability.isAvailable) {
          setError("Biometric authentication is not available on this device");
          setLoading(false);
          return;
        }

        setBiometryType(availability.biometryType || BiometricType.NONE);
        setShowBiometricPrompt(true);
      } catch (error) {
        setError("Failed to check biometric authentication status");
        console.error(
          "[BiometricLogin] Error checking biometric status:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    checkBiometricStatus();
  }, [checkAvailability, isBiometricsEnabled, onCancel]);

  // Handle biometric authentication
  const handleAuthenticate = useCallback(async () => {
    setError(null);
    try {
      console.log("[BiometricLogin] Starting biometric authentication");
      const authenticated = await authenticate({
        reason: "Log in op je Paperwork account",
        title: `${getBiometricName(biometryType, true)} login`,
        subtitle: `Login met ${getBiometricName(biometryType)}`,
        allowDeviceCredential: true,
      });

      console.log("[BiometricLogin] Authentication result:", authenticated);

      if (authenticated) {
        // Get stored credentials after successful biometric auth
        const credentials = await getCredentials();
        if (credentials) {
          onLoginSuccess(credentials.username, credentials.password);
        } else {
          setError("Geen opgeslagen inloggegevens gevonden");
        }
      } else {
        // Handle authentication failure or cancellation
        console.log("[BiometricLogin] Authentication failed or was cancelled");
        setError("Biometrische verificatie mislukt of geannuleerd");
      }
    } catch (error) {
      setError("Authenticatie mislukt");
      console.error("[BiometricLogin] Authentication error:", error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- biometryType is intentionally excluded: including it would re-create the callback on every availability check, triggering the auto-prompt effect loop
  }, [authenticate, getCredentials, onLoginSuccess]);

  // Show biometric prompt based on autoPrompt setting
  useEffect(() => {
    // Skip auto-prompt on Android to avoid the biometric dialog loop issue
    const shouldAutoPrompt = autoPrompt && !isPlatform("android");

    if (showBiometricPrompt && shouldAutoPrompt) {
      console.log("[BiometricLogin] Auto-prompting biometric authentication");
      handleAuthenticate();
    } else if (showBiometricPrompt) {
      console.log(
        "[BiometricLogin] Auto-prompt skipped, waiting for manual action"
      );
    }
  }, [handleAuthenticate, showBiometricPrompt, autoPrompt]);

  const getBiometricIcon = () => {
    if (biometryType === BiometricType.FACE) {
      return scanOutline;
    } else if (biometryType === BiometricType.FINGERPRINT) {
      return fingerPrintOutline;
    }
    return keyOutline;
  };

  if (loading) {
    return (
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Biometrie controleren...</IonCardTitle>
        </IonCardHeader>
      </IonCard>
    );
  }

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          Login met {getBiometricName(biometryType, true)}
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <div className="ion-text-center ion-padding">
          <IonIcon
            icon={getBiometricIcon()}
            style={{
              fontSize: "64px",
              color: "var(--ion-color-primary)",
            }}
          />

          {error && <p className="ion-text-color-danger">{error}</p>}
        </div>

        <div className="ion-padding">
          <IonButton expand="block" onClick={handleAuthenticate}>
            Gebruik {getBiometricName(biometryType, true)}
          </IonButton>
        </div>
      </IonCardContent>
    </IonCard>
  );
};
