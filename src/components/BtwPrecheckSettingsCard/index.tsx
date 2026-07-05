import React from "react";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonToggle,
  IonText,
} from "@ionic/react";
import { AxiosError } from "axios";

import useSettings from "../../hooks/useSettings";
import {
  useBtwPrecheckPreferences,
  useUpdateBtwPrecheckPreferences,
} from "../../hooks/useBtwPrecheck";
import { useToast } from "../../hooks/useToast";

interface CheckToggles {
  missingDocuments: boolean;
  vatArithmetic: boolean;
  duplicates: boolean;
  historyAnomalies: boolean;
}

const DEFAULT_CHECKS: CheckToggles = {
  missingDocuments: true,
  vatArithmetic: true,
  duplicates: true,
  historyAnomalies: true,
};

const CHECK_LABELS: Array<{ key: keyof CheckToggles; label: string }> = [
  { key: "missingDocuments", label: "Ontbrekende documenten" },
  { key: "vatArithmetic", label: "BTW-rekenfouten" },
  { key: "duplicates", label: "Mogelijke duplicaten" },
  { key: "historyAnomalies", label: "Afwijkingen in geschiedenis" },
];

const BtwPrecheckSettingsCard: React.FC = () => {
  const { getSettings, updateSettings } = useSettings();
  const settingsQuery = getSettings();
  const { data: prefsData, isError: prefsIsError, error: prefsError } =
    useBtwPrecheckPreferences();
  const updatePrefs = useUpdateBtwPrecheckPreferences();
  const { showToast } = useToast();

  const checks: CheckToggles = {
    ...DEFAULT_CHECKS,
    ...settingsQuery.data?.data.btwPrecheck,
  };

  const handleCheckToggle = (key: keyof CheckToggles, checked: boolean) => {
    updateSettings.mutate({
      btwPrecheck: { ...checks, [key]: checked },
    });
  };

  const handlePrefToggle = (
    key: "emailNotifications" | "inAppNotifications" | "pushNotifications",
    checked: boolean
  ) => {
    updatePrefs.mutate(
      { [key]: checked },
      {
        onError: () => {
          showToast("Kon de instelling niet opslaan.", "error");
        },
      }
    );
  };

  const prefs = prefsData?.data;

  const renderNotificationSection = () => {
    if (prefsIsError) {
      const status = (prefsError as AxiosError)?.response?.status;
      return (
        <IonText color="medium">
          <p>
            {status === 503
              ? "BTW pre-check is momenteel niet beschikbaar."
              : "Kon de meldingsvoorkeuren niet laden."}
          </p>
        </IonText>
      );
    }

    return (
      <>
        <IonItem lines="none">
          <IonLabel>E-mail</IonLabel>
          <IonToggle
            data-testid="toggle-emailNotifications"
            checked={prefs?.emailNotifications ?? true}
            onIonChange={(e) =>
              handlePrefToggle("emailNotifications", e.detail.checked)
            }
          />
        </IonItem>
        <IonItem lines="none">
          <IonLabel>In-app</IonLabel>
          <IonToggle
            data-testid="toggle-inAppNotifications"
            checked={prefs?.inAppNotifications ?? true}
            onIonChange={(e) =>
              handlePrefToggle("inAppNotifications", e.detail.checked)
            }
          />
        </IonItem>
        <IonItem lines="none">
          <IonLabel>Push</IonLabel>
          <IonToggle
            data-testid="toggle-pushNotifications"
            checked={prefs?.pushNotifications ?? false}
            onIonChange={(e) =>
              handlePrefToggle("pushNotifications", e.detail.checked)
            }
          />
        </IonItem>
      </>
    );
  };

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>BTW Pre-Check Instellingen</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <h3>Controles</h3>
        {CHECK_LABELS.map(({ key, label }) => (
          <IonItem key={key} lines="none">
            <IonLabel>{label}</IonLabel>
            <IonToggle
              data-testid={`toggle-${key}`}
              checked={checks[key]}
              onIonChange={(e) => handleCheckToggle(key, e.detail.checked)}
            />
          </IonItem>
        ))}

        <h3>Meldingen</h3>
        {renderNotificationSection()}
      </IonCardContent>
    </IonCard>
  );
};

export default BtwPrecheckSettingsCard;
