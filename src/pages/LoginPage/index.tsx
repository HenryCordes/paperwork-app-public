import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonButton,
  IonLoading,
  IonCard,
  IonCardContent,
  IonIcon,
  IonModal,
  isPlatform,
} from "@ionic/react";
import { fingerPrintOutline, scanOutline } from "ionicons/icons";
import { useAuth } from "../../hooks/useAuth";
import { useIonRouter } from "@ionic/react";
import { useBiometrics } from "../../hooks/biometrics/useBiometrics";
import { useToast } from "../../hooks/useToast";
import { BiometricOptIn } from "../../components/BiometricOptIn/BiometricOptIn";
import { BiometricType } from "../../hooks/biometrics/biometrics.types";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import "./styles.css";
import { getBiometricName } from "../../utils/bioMetricUtils";
import { MIN_SCREEN_WIDTH } from "../../common/versionConstants";

const inputIonStyles = {
  width: "100%",
  background: "transparent",
  color: "var(--ion-text-color)",
  fontSize: "16px",
  border: "none",
  borderBottom: "1px solid var(--ion-color-medium-shade)",
  padding: "10px 0",
  marginTop: "8px",
  marginBottom: "8px",
  outline: "none",
  borderRadius: "0",
};

const ionItemStyles = { "--inner-border-width": "0px" };

const RECENT_LOGOUT_KEY = "recent_logout";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { showToast } = useToast();
  const [areLoggingIn, setAreLoggingIn] = useState(false);
  const [showBiometricOptIn, setShowBiometricOptIn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [credentialsStored, setCredentialsStored] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(
    BiometricType.NONE
  );
  const [isAfterLogout, setIsAfterLogout] = useState(false);

  const ionRouter = useIonRouter();
  const { login } = useAuth();
  const {
    checkAvailability,
    isBiometricsEnabled,
    getCredentials,
    authenticate,
  } = useBiometrics();

  // Check if we've recently logged out
  useEffect(() => {
    const checkRecentLogout = async () => {
      try {
        try {
          const recentLogoutValue = await SecureStoragePlugin.get({
            key: RECENT_LOGOUT_KEY,
          });
          setIsAfterLogout(recentLogoutValue.value === "true");

          if (recentLogoutValue.value === "true") {
            console.log(
              "[LoginPage] Recent logout detected, biometric login will not trigger automatically"
            );
          }
        } catch {
          console.log(
            "[LoginPage] No recent logout flag found - expected on first install"
          );
          setIsAfterLogout(false);
        }
      } catch (error) {
        console.error(
          "[LoginPage] Error checking recent logout status:",
          error
        );
        setIsAfterLogout(false);
      }
    };

    checkRecentLogout();
  }, []);

  // Run once on mount to check for biometrics
  useEffect(() => {
    let mounted = true;

    const checkBiometrics = async () => {
      try {
        if (!mounted) return;

        if (isAfterLogout) {
          console.log(
            "[LoginPage] After logout - blocking automatic biometric login"
          );
          return;
        }

        const availability = await checkAvailability();
        console.log("[LoginPage] Biometric availability:", availability);
        setBiometricAvailable(availability.isAvailable);
        setBiometricType(availability.biometryType || BiometricType.NONE);
        const credentials = await getCredentials();
        setCredentialsStored(credentials !== null);

        if (isPlatform("android")) {
          console.log(
            "[LoginPage] Android detected - skipping automatic biometric login"
          );
          return;
        }

        if (availability.isAvailable) {
          const enabled = await isBiometricsEnabled();
          console.log("[LoginPage] Biometrics enabled:", enabled);

          if (!mounted) return;

          if (enabled && !areLoggingIn) {
            console.log(
              "[LoginPage] Retrieved credentials:",
              credentials ? "Found" : "Not found"
            );

            if (credentials) {
              console.log("[LoginPage] Triggering automatic biometric login");
              handleDirectBiometricAuth(false);
            } else {
              console.log(
                "[LoginPage] No credentials stored for biometric login"
              );
            }
          }
        }
      } catch (error) {
        console.error("[LoginPage] Error checking biometrics:", error);
      }
    };

    checkBiometrics();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs only on mount; re-running on dependency changes would re-trigger automatic biometric login unexpectedly
  }, []);

  const handleLogin = async (e: React.FormEvent | null = null) => {
    if (e) {
      e.preventDefault();
    }

    if (!email || !password) {
      showToast("Vul alstublieft alle velden in", "error");
      return;
    }

    try {
      setAreLoggingIn(true);

      const resultLogin = await login.mutateAsync({
        email,
        password,
      });

      if (resultLogin.token) {
        try {
          await SecureStoragePlugin.remove({ key: RECENT_LOGOUT_KEY });
          console.log(
            "[LoginPage] Cleared recent logout flag on successful login"
          );
        } catch {
          console.log("[LoginPage] No recent logout flag to clear");
        }

        if (biometricAvailable) {
          const enabled = await isBiometricsEnabled();
          const credentials = await getCredentials();

          console.log(
            "[LoginPage] After login check - biometrics enabled:",
            enabled
          );
          console.log(
            "[LoginPage] After login check - credentials exist:",
            credentials ? "Yes" : "No"
          );

          // Show opt-in if either not enabled OR no credentials stored
          if (!enabled || !credentials) {
            console.log("[LoginPage] Showing biometric opt-in prompt");
            setShowBiometricOptIn(true);
            setAreLoggingIn(false);
            return;
          }
        }

        navigateToDashboard();
      } else {
        showToast("Login niet succesvol", "error");
      }
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message, "error");
      } else {
        showToast(
          "Een onverwachte fout is opgetreden, tijdens het inloggen",
          "error"
        );
      }
    } finally {
      setAreLoggingIn(false);
    }
  };

  const handleDirectBiometricAuth = async (isManualTrigger = false) => {
    try {
      if (!isManualTrigger) {
        try {
          try {
            const recentLogoutValue = await SecureStoragePlugin.get({
              key: RECENT_LOGOUT_KEY,
            });

            if (recentLogoutValue.value === "true") {
              console.log(
                "[LoginPage] BLOCKED: Automatic biometric auth attempted after logout"
              );
              return;
            }
          } catch {
            console.log(
              "[LoginPage] No recent logout flag found, continuing with biometric auth"
            );
          }
        } catch (error) {
          console.error(
            "[LoginPage] Error checking recent logout flag:",
            error
          );
        }
      }

      const credentials = await getCredentials();
      if (credentials) {
        const authenticated = await authenticate({
          reason: "Log in op je Paperwork account",
          title: `${getBiometricName(biometricType, true)} login`,
          subtitle: `Login met ${getBiometricName(biometricType)}`,
          allowDeviceCredential: true,
        });

        if (authenticated) {
          handleBiometricLoginSuccess(
            credentials.username,
            credentials.password
          );
        }
      } else {
        showToast("Geen opgeslagen inloggegevens gevonden", "error");
      }
    } catch (error) {
      showToast("Authenticatie mislukt", "error");
      console.error(
        "[LoginPage] Direct biometric authentication error:",
        error
      );
    }
  };

  const handleBiometricLoginSuccess = async (
    username: string,
    password: string
  ) => {
    try {
      console.log("[LoginPage] Attempting login with biometric credentials");
      setAreLoggingIn(true);
      const resultLogin = await login.mutateAsync({
        email: username,
        password: password,
      });

      if (resultLogin.token) {
        console.log("[LoginPage] Biometric login successful");
        try {
          await SecureStoragePlugin.remove({ key: RECENT_LOGOUT_KEY });
          console.log(
            "[LoginPage] Cleared recent logout flag on biometric login success"
          );
        } catch {
          console.log(
            "[LoginPage] No recent logout flag to clear during biometric login"
          );
        }
        navigateToDashboard();
      } else {
        showToast("Biometrische login mislukt", "error");
      }
    } catch (error) {
      console.error("[LoginPage] Error during biometric login:", error);
      if (error instanceof Error) {
        showToast(error.message, "error");
      } else {
        showToast("Biometrische login mislukt", "error");
      }
    } finally {
      setAreLoggingIn(false);
    }
  };

  const handleBiometricOptInComplete = (enableBiometrics: boolean) => {
    console.log(
      "[LoginPage] Biometric opt-in complete, enabled:",
      enableBiometrics
    );
    setShowBiometricOptIn(false);
    navigateToDashboard();
  };

  const navigateToDashboard = () => {
    setEmail("");
    setPassword("");

    ionRouter.push("/", "root");
    setTimeout(() => {
      ionRouter.push("/dashboard", "forward", "replace");
    }, 100);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard className="login-card">
          <IonCardContent>
            <div className="profile-header-content">
              <div className="app-icon-container">
                <img
                  src="assets/img/paperwork-logo.png"
                  alt="Paperwork App"
                  className="app-icon"
                />
              </div>
              <div className="toolbar-title">Paperwork</div>
            </div>
          </IonCardContent>
        </IonCard>
        <form onSubmit={handleLogin}>
          <IonItem style={ionItemStyles}>
            <IonLabel position="stacked">Email</IonLabel>
            <input
              className="native-input sc-ion-input-md"
              style={inputIonStyles}
              type="email"
              value={email}
              placeholder="Voer je e-mailadres in"
              onChange={(e) => setEmail(e.target.value)}
              required
              pattern=".+@.+\..+"
            />
          </IonItem>

          <IonItem style={ionItemStyles}>
            <IonLabel position="stacked">Password</IonLabel>
            <input
              className="native-input sc-ion-input-md"
              style={inputIonStyles}
              type="password"
              value={password}
              placeholder="Voer je wachtwoord in"
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={1}
            />
          </IonItem>

          <div className="ion-padding-top">
            <IonButton expand="block" type="submit">
              Login
            </IonButton>

            {/* Show manual biometric login button after logout */}
            {isAfterLogout && biometricAvailable && credentialsStored && (
              <IonButton
                expand="block"
                fill="outline"
                className="ion-margin-top"
                onClick={() => handleDirectBiometricAuth(true)}
              >
                <IonIcon
                  slot="start"
                  icon={
                    biometricType === BiometricType.FACE
                      ? scanOutline
                      : fingerPrintOutline
                  }
                />
                {biometricType === BiometricType.FACE
                  ? `Login met ${getBiometricName(biometricType)}`
                  : `Login met ${getBiometricName(biometricType)}`}
              </IonButton>
            )}
          </div>

          <div
            className={`ion-padding-top ion-text-center password-forgotten ${
              window.innerWidth < MIN_SCREEN_WIDTH && "login-smaller"
            }`}
          >
            <p>
              <span>Wachtwoord vergeten?</span>{" "}
              <IonButton fill="clear" routerLink="/reset" size="small">
                Wachtwoord wijzigen
              </IonButton>
            </p>
          </div>
        </form>

        <IonLoading isOpen={areLoggingIn} message="Logging in..." />

        <IonModal
          isOpen={showBiometricOptIn}
          onDidDismiss={() => handleBiometricOptInComplete(false)}
        >
          <BiometricOptIn
            username={email}
            password={password}
            onComplete={handleBiometricOptInComplete}
            onCancel={() => handleBiometricOptInComplete(false)}
          />
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
