import React, { useEffect, useState } from "react";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonToggle,
} from "@ionic/react";
import { fingerPrintOutline, scanOutline, closeOutline } from "ionicons/icons";
import { useBiometrics } from "../../hooks/biometrics/useBiometrics";

interface BiometricOptInProps {
  username: string;
  password: string;
  onComplete: (enableBiometrics: boolean) => void;
  onCancel: () => void;
}

export const BiometricOptIn: React.FC<BiometricOptInProps> = ({
  username,
  password,
  onComplete,
  onCancel,
}) => {
  const { checkAvailability, saveCredentials, setBiometricsEnabled } =
    useBiometrics();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasFaceID, setHasFaceID] = useState(false);
  const [hasFingerprint, setHasFingerprint] = useState(false);
  const [enableBiometrics, setEnableBiometrics] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBiometricAvailability = async () => {
      setLoading(true);
      try {
        const result = await checkAvailability();
        setBiometricAvailable(result.isAvailable);
        setHasFaceID(!!result.canUseFaceID);
        setHasFingerprint(!!result.canUseFingerprint);
      } catch (error) {
        console.error(
          "[BiometricOptIn] Error checking biometry availability:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    checkBiometricAvailability();
  }, [checkAvailability]);

  const handleSavePreference = async () => {
    if (enableBiometrics) {
      console.log('[BiometricOptIn] Saving credentials for:', username);
      // Save credentials for biometric auth
      const saved = await saveCredentials({
        username,
        password,
        server: "nl.paperwork.app.auth",
      });
      console.log('[BiometricOptIn] Credentials saved successfully:', saved);

      // Enable biometrics in user preferences
      await setBiometricsEnabled(true);
      console.log('[BiometricOptIn] Biometrics enabled in preferences');
    }

    onComplete(enableBiometrics);
  };

  const getBiometricIcon = () => {
    if (hasFaceID) {
      return scanOutline;
    }
    return fingerPrintOutline;
  };

  const getBiometricName = () => {
    if (hasFaceID) {
      return "Face Recognition";
    } else if (hasFingerprint) {
      return "Fingerprint";
    }
    return "Biometric Authentication";
  };

  if (loading) {
    return (
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Checking biometric capabilities...</IonCardTitle>
        </IonCardHeader>
      </IonCard>
    );
  }

  if (!biometricAvailable) {
    return (
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Biometrics Not Available</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <p>
            Your device doesn't support biometric authentication or it's not
            configured.
          </p>
          <IonButton expand="block" onClick={() => onComplete(false)}>
            Continue without Biometrics
          </IonButton>
        </IonCardContent>
      </IonCard>
    );
  }

  return (
    <IonCard>
      <IonCardHeader>
        <IonIcon
          icon={closeOutline}
          slot="end"
          onClick={onCancel}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            fontSize: "24px",
            cursor: "pointer",
          }}
        />
        <IonCardTitle>Enable {getBiometricName()}</IonCardTitle>
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
          <p>
            Use {getBiometricName()} to quickly and securely log in to your
            account without typing your password.
          </p>
        </div>

        <IonList>
          <IonItem>
            <IonLabel>Enable {getBiometricName()}</IonLabel>
            <IonToggle
              checked={enableBiometrics}
              onIonChange={(e) => setEnableBiometrics(e.detail.checked)}
            />
          </IonItem>
        </IonList>

        <div className="ion-padding">
          <IonButton expand="block" onClick={handleSavePreference}>
            Continue
          </IonButton>
        </div>
      </IonCardContent>
    </IonCard>
  );
};
