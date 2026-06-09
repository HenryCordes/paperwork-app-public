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

const Reset: React.FC = () => {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const history = useHistory();

  // Use password reset hook
  const { forgotPassword, sendResetEmail } = usePasswordReset();

  // Combined loading state from both mutations
  const isLoading = forgotPassword.isPending || sendResetEmail.isPending;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email) {
      setErrorMessage("Vul alstublieft je e-mailadres in");
      return;
    }

    try {
      // Step 1: Request password reset
      const forgotResponse = await forgotPassword.mutateAsync({ email });

      if (forgotResponse && forgotResponse.success) {
        // Step 2: Send reset email with the token data
        const emailResponse = await sendResetEmail.mutateAsync(
          forgotResponse.emailData
        );

        if (emailResponse && emailResponse.success) {
          setSuccessMessage("Reset instructies worden verstuurd naar je email");
          // Navigate to the password reset page
          setTimeout(() => {
            history.push("/password-reset");
          }, 2000);
        } else {
          setErrorMessage("Er ging iets mis bij het versturen van de email");
        }
      } else {
        setErrorMessage("Kon het wachtwoord niet resetten");
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Een onverwachte fout is opgetreden bij het resetten van je wachtwoord"
        );
      }
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Wachtwoord Resetten</IonTitle>
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

        <form onSubmit={handleReset}>
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

          <div className="ion-padding-top">
            <IonButton expand="block" type="submit">
              {isLoading ? "Bezig met verzenden..." : "Wachtwoord wijzigen"}
            </IonButton>
          </div>

          <div className="ion-padding-top ion-text-center">
            <IonButton fill="clear" routerLink="/login" size="small">
              Terug naar login
            </IonButton>
          </div>
        </form>

        <IonLoading isOpen={isLoading} message="Bezig met verzenden..." />

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
          duration={2000}
          color="success"
          onDidDismiss={() => setSuccessMessage(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Reset;
