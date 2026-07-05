import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonInput,
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
} from "@ionic/react";
import {
  saveOutline,
  refreshOutline,
  camera,
  image,
  trash,
} from "ionicons/icons";
import useSettings from "../../../hooks/useSettings";
import useDocuments from "../../../hooks/useDocuments";
import { Settings, SettingsUpdateRequest } from "../../../api/types/settings";
import { useHistory } from "react-router-dom";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import "./styles.css";

const SettingsEditPage: React.FC = () => {
  const { getSettings, updateSettings } = useSettings();
  const { uploadDocument, getApiDocumentUrl } = useDocuments();
  const settingsQuery = getSettings();
  const [presentToast] = useIonToast();
  const [formData, setFormData] = useState<SettingsUpdateRequest>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const history = useHistory();

  // Destructure the query result for easier access
  const {
    data: settingsData,
    isLoading,
    isError,
    error,
    refetch,
  } = settingsQuery;

  // Initialize form data when settings are loaded
  useEffect(() => {
    if (settingsData?.data) {
      setFormData(settingsData.data);

      // Set logo preview if available
      if (settingsData.data.companyLogo) {
        setLogoPreview(getApiDocumentUrl(settingsData.data.companyLogo));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: getApiDocumentUrl is a stable utility; re-running when it changes is unnecessary and would reset the form
  }, [settingsData]);

  // Display error toast if fetch fails
  useEffect(() => {
    if (isError) {
      presentToast({
        message: `Instellingen laden mislukt: ${
          error?.message || "Onbekende fout"
        }`,
        duration: 3000,
        color: "danger",
      });
    }
  }, [isError, error, presentToast]);

  // Handle form input changes
  const handleInputChange = (e: CustomEvent, field: keyof Settings) => {
    setFormData({
      ...formData,
      [field]: e.detail.value,
    });
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync(formData);

      presentToast({
        message: "Instellingen succesvol aangepast",
        duration: 2000,
        color: "success",
      });

      // Navigate back to details page after successful save
      history.goBack();
    } catch (error) {
      presentToast({
        message: `Instellingen aanpassen mislukt: ${
          error instanceof Error ? error.message : "Onbekende fout"
        }`,
        duration: 3000,
        color: "danger",
      });
    }
  };

  // Handle adding a logo using camera or gallery
  const handleAddLogo = async (source: CameraSource) => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: source,
      });

      if (!image.webPath) {
        throw new Error("Afbeelding niet gevonden");
      }

      // Convert to file
      const response = await fetch(image.webPath);
      const blob = await response.blob();
      const fileName = `company_logo_${Date.now()}.${image.format}`;
      const file = new File([blob], fileName, {
        type: `image/${image.format}`,
      });

      // Upload and update preview
      setLogoPreview(URL.createObjectURL(blob));

      // Upload document and update form data
      const fileLocation = await uploadDocument.mutateAsync(file);

      setFormData({
        ...formData,
        companyLogo: fileLocation,
      });

      presentToast({
        message: "Logo successvol geüpload",
        duration: 2000,
        color: "success",
      });
    } catch (error) {
      presentToast({
        message: `Uploaden van logo mislukt: ${
          error instanceof Error ? error.message : "Onbekende fout"
        }`,
        duration: 3000,
        color: "danger",
      });
    }
  };

  // Handle removing logo
  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData({
      ...formData,
      companyLogo: "",
    });
  };

  // Handle pull-to-refresh
  const handleRefresh = async (event: CustomEvent) => {
    const target = event.target as HTMLIonRefresherElement;
    try {
      await refetch();
      presentToast({
        message: "Instellingen vernieuwd",
        duration: 2000,
        color: "success",
      });
    } catch {
      presentToast({
        message: "Instellingen vernieuwen mislukt",
        duration: 3000,
        color: "danger",
      });
    }
    target.complete();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" text="" />
          </IonButtons>
          <IonTitle>Instellingen bewerken</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={handleSaveSettings}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? (
                <IonSpinner name="dots" />
              ) : (
                <IonIcon slot="icon-only" icon={saveOutline} />
              )}
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
                    <IonLabel position="stacked">Bedrijfsnaam</IonLabel>
                    <IonInput
                      value={formData.companyName}
                      onIonInput={(e) => handleInputChange(e, "companyName")}
                    />
                  </IonItem>

                  <IonItem className="logo-upload-container">
                    <IonLabel position="stacked">Bedrijfslogo</IonLabel>

                    {logoPreview && (
                      <div className="logo-preview">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="company-logo"
                        />
                        <div className="logo-actions">
                          <IonButton
                            fill="clear"
                            color="danger"
                            onClick={handleRemoveLogo}
                          >
                            <IonIcon slot="icon-only" icon={trash} />
                          </IonButton>
                        </div>
                      </div>
                    )}
                    <div className="logo-upload-buttons">
                      <IonButton
                        onClick={() => handleAddLogo(CameraSource.Camera)}
                        disabled={uploadDocument.isPending}
                      >
                        <IonIcon slot="start" icon={camera} />
                        Camera
                      </IonButton>
                      <IonButton
                        onClick={() => handleAddLogo(CameraSource.Photos)}
                        disabled={uploadDocument.isPending}
                      >
                        <IonIcon slot="start" icon={image} />
                        Foto's
                      </IonButton>
                    </div>

                    {uploadDocument.isPending && (
                      <div className="upload-loading">
                        <IonSpinner name="dots" />
                        <IonText>
                          <p>Uploaden...</p>
                        </IonText>
                      </div>
                    )}
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Website</IonLabel>
                    <IonInput
                      value={formData.website}
                      onIonInput={(e) => handleInputChange(e, "website")}
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">E-mail</IonLabel>
                    <IonInput
                      value={formData.companyEmail}
                      onIonInput={(e) => handleInputChange(e, "companyEmail")}
                      type="email"
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Telefoonnummer</IonLabel>
                    <IonInput
                      value={formData.phoneNumber}
                      onIonInput={(e) => handleInputChange(e, "phoneNumber")}
                      type="tel"
                    />
                  </IonItem>
                </IonList>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Adresgegevens</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  <IonItem>
                    <IonLabel position="stacked">Straat</IonLabel>
                    <IonInput
                      value={formData.street}
                      onIonInput={(e) => handleInputChange(e, "street")}
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Huisnummer</IonLabel>
                    <IonInput
                      value={formData.houseNumber}
                      onIonInput={(e) => handleInputChange(e, "houseNumber")}
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Postcode</IonLabel>
                    <IonInput
                      value={formData.postalCode}
                      onIonInput={(e) => handleInputChange(e, "postalCode")}
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Plaats</IonLabel>
                    <IonInput
                      value={formData.city}
                      onIonInput={(e) => handleInputChange(e, "city")}
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Land</IonLabel>
                    <IonInput
                      value={formData.country}
                      onIonInput={(e) => handleInputChange(e, "country")}
                    />
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
                    <IonLabel position="stacked">Valuta</IonLabel>
                    <IonInput
                      value={formData.currency}
                      onIonInput={(e) => handleInputChange(e, "currency")}
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">BTW Percentage</IonLabel>
                    <IonInput
                      value={formData.taxPercentage}
                      onIonInput={(e) => handleInputChange(e, "taxPercentage")}
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">BTW Nummer</IonLabel>
                    <IonInput
                      value={formData.taxNumber}
                      onIonInput={(e) => handleInputChange(e, "taxNumber")}
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">KVK Nummer</IonLabel>
                    <IonInput
                      value={formData.chamberOfCommerceNumber}
                      onIonInput={(e) =>
                        handleInputChange(e, "chamberOfCommerceNumber")
                      }
                    />
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
                    <IonLabel position="stacked">Banknaam</IonLabel>
                    <IonInput
                      value={formData.bankName}
                      onIonInput={(e) => handleInputChange(e, "bankName")}
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">IBAN</IonLabel>
                    <IonInput
                      value={formData.bankIBAN}
                      onIonInput={(e) => handleInputChange(e, "bankIBAN")}
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

export default SettingsEditPage;
