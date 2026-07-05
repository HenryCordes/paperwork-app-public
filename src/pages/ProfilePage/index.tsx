import React, { useEffect, useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonList,
  IonSkeletonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonToast,
  IonIcon,
  IonButtons,
  IonToggle,
} from "@ionic/react";
import {
  personCircleOutline,
  businessOutline,
  mailOutline,
  calendarOutline,
  shieldOutline,
  settingsOutline,
} from "ionicons/icons";
import { useProfile } from "../../hooks/useProfile";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import LogoutButton from "../../components/LogoutButton";
import MenuButton from "../../components/MenuButton";
import { useBiometrics } from "../../hooks/biometrics/useBiometrics";
import { BiometricType } from "../../hooks/biometrics/biometrics.types";
import { fingerPrintOutline, scanOutline } from "ionicons/icons";
import "./styles.css";
import { getBiometricName } from "../../utils/bioMetricUtils";

const ProfilePage: React.FC = () => {
  const { data: profile, isLoading, error } = useProfile();

  const { checkAvailability, isBiometricsEnabled, setBiometricsEnabled } =
    useBiometrics();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometricType>(
    BiometricType.NONE
  );
  const [isBiometricsOn, setIsBiometricsOn] = useState(false);

  // Effect to check biometric availability and current status
  useEffect(() => {
    const initBiometrics = async () => {
      try {
        // Check if biometrics are available on the device
        const result = await checkAvailability();
        setBiometricAvailable(result.isAvailable);
        setBiometryType(result.biometryType || BiometricType.NONE);

        // Get current biometrics enabled status
        const enabled = await isBiometricsEnabled();
        setIsBiometricsOn(enabled);
      } catch (error) {
        console.error("Error checking biometrics:", error);
      }
    };

    initBiometrics();
  }, [checkAvailability, isBiometricsEnabled]);

  // Handle biometrics toggle change
  const handleBiometricToggle = async (e: CustomEvent) => {
    const isEnabled = e.detail.checked;
    setIsBiometricsOn(isEnabled);
    await setBiometricsEnabled(isEnabled);
  };

  // Format the creation date nicely
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d MMMM yyyy", { locale: nl });
    } catch {
      return dateString;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <MenuButton />
          <IonTitle>Profiel</IonTitle>
          <IonButtons slot="end">
            <LogoutButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
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
        {isLoading && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonSkeletonText animated style={{ width: "70%" }} />
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                {[...Array(5)].map((_, i) => (
                  <IonItem key={i}>
                    <IonLabel>
                      <IonSkeletonText animated style={{ width: "80%" }} />
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>
        )}

        {error && (
          <IonToast
            isOpen={!!error}
            message={
              error instanceof Error
                ? error.message
                : "Kon profielgegevens niet laden"
            }
            duration={3000}
            color="danger"
          />
        )}

        {profile && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{profile.name}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonIcon icon={personCircleOutline} slot="start" />
                  <IonLabel>
                    <h2>Naam</h2>
                    <p>{profile.name}</p>
                  </IonLabel>
                </IonItem>

                <IonItem>
                  <IonIcon icon={businessOutline} slot="start" />
                  <IonLabel>
                    <h2>Bedrijf</h2>
                    <p>{profile.companyName}</p>
                  </IonLabel>
                </IonItem>

                <IonItem>
                  <IonIcon icon={mailOutline} slot="start" />
                  <IonLabel>
                    <h2>Email</h2>
                    <p>{profile.email}</p>
                  </IonLabel>
                </IonItem>

                <IonItem>
                  <IonIcon icon={shieldOutline} slot="start" />
                  <IonLabel>
                    <h2>Rol</h2>
                    <p>{profile.role}</p>
                  </IonLabel>
                </IonItem>

                <IonItem>
                  <IonIcon icon={calendarOutline} slot="start" />
                  <IonLabel>
                    <h2>Account aangemaakt</h2>
                    <p>{formatDate(profile.createdAt)}</p>
                  </IonLabel>
                </IonItem>

                {biometricAvailable && biometryType !== BiometricType.NONE && (
                  <IonItem>
                    <IonIcon
                      icon={
                        biometryType === BiometricType.FACE
                          ? scanOutline
                          : fingerPrintOutline
                      }
                      slot="start"
                    />
                    <IonLabel>
                      <h2>Biometrische login</h2>
                      <p>Log in met {getBiometricName(biometryType)}</p>
                    </IonLabel>
                    <IonToggle
                      checked={isBiometricsOn}
                      onIonChange={handleBiometricToggle}
                    />
                  </IonItem>
                )}

                <IonItem lines="none" routerLink="/settings" detail>
                  <IonIcon icon={settingsOutline} slot="start" />
                  <IonLabel>
                    <h2>Instellingen</h2>
                    <p>Bedrijfsinstellingen beheren</p>
                  </IonLabel>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ProfilePage;
