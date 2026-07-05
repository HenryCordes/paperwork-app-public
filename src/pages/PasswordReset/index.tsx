import React, { useState } from "react";
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
  IonToast,
  IonCard,
  IonCardContent,
} from "@ionic/react";
import { useHistory } from "react-router";
import { usePasswordReset } from "../../hooks/usePasswordReset";
import { useAuth } from "../../hooks/useAuth";
import "./styles.css";

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

const PasswordReset: React.FC = () => {
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const history = useHistory();

  // Use password reset hook and auth hook
  const { resetPassword } = usePasswordReset();
  const { logout } = useAuth();

  const validateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !resetToken) {
      setErrorMessage("Vul alstublieft je e-mailadres en de resetcode in");
      return;
    }

    // In the real implementation we'd verify the token here
    // Since we're not implementing a validation endpoint, we'll just proceed to step 2
    setStep(2);
    setSuccessMessage("Voer je nieuwe wachtwoord in");
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password || !confirmPassword) {
      setErrorMessage("Vul alstublieft alle velden in");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Wachtwoorden komen niet overeen");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Wachtwoord moet minimaal 8 tekens bevatten");
      return;
    }

    try {
      const response = await resetPassword.mutateAsync({
        email,
        resetToken,
        newPassword: password,
      });

      if (response && response.success) {
        setSuccessMessage("Je wachtwoord is gewijzigd");
        
        // First log out the user to clear any existing authentication state
        logout();
        
        setTimeout(() => {
          history.push("/login");
        }, 1000);
      } else {
        setErrorMessage("Kon wachtwoord niet wijzigen");
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Een onverwachte fout is opgetreden bij het wijzigen van je wachtwoord"
        );
      }
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Wachtwoord wijzigen</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
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

        {step === 1 ? (
          <form onSubmit={validateToken}>
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
              <IonLabel position="stacked">Reset Code</IonLabel>
              <input
                className="native-input sc-ion-input-md"
                style={inputIonStyles}
                type="text"
                value={resetToken}
                placeholder="Voer de resetcode uit de e-mail in"
                onChange={(e) => setResetToken(e.target.value)}
                required
              />
            </IonItem>

            <div className="ion-padding-top">
              <IonButton expand="block" type="submit">
                Verifiëren
              </IonButton>
            </div>

            <div className="ion-padding-top ion-text-center">
              <IonButton fill="clear" routerLink="/reset" size="small">
                Nieuwe reset code aanvragen
              </IonButton>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset}>
            <IonItem style={ionItemStyles}>
              <IonLabel position="stacked">Nieuw wachtwoord</IonLabel>
              <input
                className="native-input sc-ion-input-md"
                style={inputIonStyles}
                type="password"
                value={password}
                placeholder="Voer je nieuwe wachtwoord in"
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </IonItem>

            <IonItem style={ionItemStyles}>
              <IonLabel position="stacked">Bevestig wachtwoord</IonLabel>
              <input
                className="native-input sc-ion-input-md"
                style={inputIonStyles}
                type="password"
                value={confirmPassword}
                placeholder="Bevestig je nieuwe wachtwoord"
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </IonItem>

            <div className="ion-padding-top">
              <IonButton
                expand="block"
                type="submit"
                disabled={resetPassword.isPending}
              >
                {resetPassword.isPending
                  ? "Bezig met wijzigen..."
                  : "Wijzig wachtwoord"}
              </IonButton>
            </div>
          </form>
        )}

        <IonLoading
          isOpen={resetPassword.isPending}
          message="Bezig met wijzigen..."
        />

        <IonToast
          isOpen={!!errorMessage}
          message={errorMessage || ""}
          duration={3000}
          color="danger"
          onDidDismiss={() => setErrorMessage(null)}
        />

        <IonToast
          isOpen={!!successMessage}
          message={successMessage || ""}
          duration={3000}
          color="success"
          onDidDismiss={() => setSuccessMessage(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default PasswordReset;
