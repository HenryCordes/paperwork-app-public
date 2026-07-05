import React, { useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonSpinner,
  IonList,
  IonRefresher,
  IonRefresherContent,
  useIonToast,
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonText,
  IonToggle,
} from "@ionic/react";
import { refreshOutline, create, notifications } from "ionicons/icons";
import useSettings from "../../../hooks/useSettings";
import useDocuments from "../../../hooks/useDocuments";
import { usePushNotifications } from "../../../hooks/usePushNotifications";
import { useHistory } from "react-router-dom";
import "./styles.css";

const SettingsDetailsPage: React.FC = () => {
  const { getSettings } = useSettings();
  const { getApiDocumentUrl } = useDocuments();
  const settingsQuery = getSettings();
  const [presentToast] = useIonToast();
  const history = useHistory();
  const { 
    settings: pushSettings, 
    updateSettings: updatePushSettings, 
    permissionStatus, 
    requestPermissions,
    loading: pushLoading 
  } = usePushNotifications();

  // Destructure the query result for easier access
  const {
    data: settingsData,
    isLoading,
    isError,
    error,
    refetch,
  } = settingsQuery;

  // Display error toast if fetch fails
  useEffect(() => {
    if (isError) {
      presentToast({
        message: `Error loading settings: ${error?.message || "Unknown error"}`,
        duration: 3000,
        color: "danger",
      });
    }
  }, [isError, error, presentToast]);

  // Handle pull-to-refresh
  const handleRefresh = async (event: CustomEvent) => {
    const target = event.target as HTMLIonRefresherElement;
    try {
      await refetch();
      presentToast({
        message: "Settings refreshed",
        duration: 2000,
        color: "success",
      });
    } catch {
      presentToast({
        message: "Error refreshing settings",
        duration: 3000,
        color: "danger",
      });
    }
    target.complete();
  };

  const navigateToEdit = () => {
    history.push("/settings/edit");
  };

  const handlePushNotificationToggle = async (enabled: boolean) => {
    if (enabled && !permissionStatus.granted) {
      const granted = await requestPermissions();
      if (!granted) {
        presentToast({
          message: "Notificatie-permissies zijn vereist om push notificaties in te schakelen",
          duration: 3000,
          color: "warning",
        });
        return;
      }
    }
    
    await updatePushSettings({ enabled });
    presentToast({
      message: enabled ? "Push notificaties ingeschakeld" : "Push notificaties uitgeschakeld",
      duration: 2000,
      color: "success",
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton text="" />
          </IonButtons>
          <IonTitle>Instellingen</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={navigateToEdit} color="primary">
              <IonIcon slot="icon-only" icon={create} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {isLoading ? (
          <div className="ion-padding ion-text-center">
            <IonSpinner />
            <IonText>
              <p>Instellingen laden...</p>
            </IonText>
          </div>
        ) : isError ? (
          <div className="ion-padding ion-text-center">
            <IonText color="danger">
              <p>Kon instellingen niet laden. Trek omlaag om te vernieuwen.</p>
            </IonText>
            <IonButton onClick={() => refetch()} color="primary">
              <IonIcon slot="start" icon={refreshOutline} />
              Opnieuw proberen
            </IonButton>
          </div>
        ) : (
          <>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Bedrijfsinformatie</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  <IonItem>
                    <IonLabel>
                      <h2>Bedrijfsnaam</h2>
                      <p>{settingsData?.data?.companyName}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>Website</h2>
                      <p>{settingsData?.data?.website || "-"}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>E-mail</h2>
                      <p>{settingsData?.data?.companyEmail}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>Telefoonnummer</h2>
                      <p>{settingsData?.data?.phoneNumber}</p>
                    </IonLabel>
                  </IonItem>
                </IonList>
                {settingsData?.data?.companyLogo && (
                  <IonItem className="company-logo-container">
                    <IonLabel>
                      <h2>Bedrijfslogo</h2>
                      <p>
                        <img
                          src={getApiDocumentUrl(settingsData.data.companyLogo)}
                          alt="Bedrijfslogo"
                          className="company-logo"
                        />
                      </p>
                    </IonLabel>
                  </IonItem>
                )}
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Adresgegevens</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  <IonItem>
                    <IonLabel>
                      <h2>Straat</h2>
                      <p>{settingsData?.data?.street}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>Huisnummer</h2>
                      <p>{settingsData?.data?.houseNumber}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>Postcode</h2>
                      <p>{settingsData?.data?.postalCode}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>Plaats</h2>
                      <p>{settingsData?.data?.city}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>Land</h2>
                      <p>{settingsData?.data?.country}</p>
                    </IonLabel>
                  </IonItem>
                </IonList>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Financiële Informatie</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  <IonItem>
                    <IonLabel>
                      <h2>Valuta</h2>
                      <p>{settingsData?.data?.currency}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>BTW Percentage</h2>
                      <p>{settingsData?.data?.taxPercentage}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>BTW Nummer</h2>
                      <p>{settingsData?.data?.taxNumber}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>KVK Nummer</h2>
                      <p>{settingsData?.data?.chamberOfCommerceNumber}</p>
                    </IonLabel>
                  </IonItem>
                </IonList>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Bankgegevens</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  <IonItem>
                    <IonLabel>
                      <h2>Banknaam</h2>
                      <p>{settingsData?.data?.bankName}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>IBAN</h2>
                      <p>{settingsData?.data?.bankIBAN}</p>
                    </IonLabel>
                  </IonItem>
                </IonList>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Notificaties</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  <IonItem>
                    <IonIcon icon={notifications} slot="start" />
                    <IonLabel>
                      <h2>Push Notificaties</h2>
                      <p>Ontvang belangrijke meldingen op je apparaat</p>
                    </IonLabel>
                    <IonToggle
                      checked={pushSettings.enabled}
                      onIonChange={(e) => handlePushNotificationToggle(e.detail.checked)}
                      disabled={pushLoading}
                    />
                  </IonItem>
                </IonList>
              </IonCardContent>
            </IonCard>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SettingsDetailsPage;
