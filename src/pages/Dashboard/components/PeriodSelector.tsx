import React from "react";
import {
  IonItem,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonLabel,
} from "@ionic/react";
import { PeriodType, PeriodPreset } from "../../../api/types/dashboard";
import {
  PERIOD_PRESETS,
  PERIOD_TYPES,
} from "../../../api/types/dashboard-constants";
import "./PeriodSelector.css";

interface PeriodSelectorProps {
  periodType: PeriodType;
  periodPreset: PeriodPreset;
  onPeriodChange: (type: PeriodType, preset: PeriodPreset) => void;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  periodType,
  periodPreset,
  onPeriodChange,
}) => {
  // Handle period type change
  const handlePeriodTypeChange = (e: CustomEvent) => {
    const newType = e.detail.value as PeriodType;
    onPeriodChange(newType, periodPreset);
  };

  // Handle period preset change
  const handlePeriodPresetChange = (e: CustomEvent) => {
    const newPreset = e.detail.value as PeriodPreset;
    onPeriodChange(periodType, newPreset);
  };

  return (
    <IonCard className="period-selector">
      <IonCardContent>
        <IonGrid>
          <IonRow>
            <IonCol size="12" sizeMd="6">
              <IonItem>
                <IonLabel position="stacked" className="label-period">
                  Per
                </IonLabel>
                <IonSelect
                  interface="action-sheet"
                  value={periodType}
                  onIonChange={handlePeriodTypeChange}
                  className="custom-select"
                >
                  <IonSelectOption value={PERIOD_TYPES.DAILY}>
                    Dag
                  </IonSelectOption>
                  <IonSelectOption value={PERIOD_TYPES.MONTHLY}>
                    Maand
                  </IonSelectOption>
                  <IonSelectOption value={PERIOD_TYPES.QUARTERLY}>
                    Kwartaal
                  </IonSelectOption>
                  <IonSelectOption value={PERIOD_TYPES.YEARLY}>
                    Jaar
                  </IonSelectOption>
                </IonSelect>
              </IonItem>
            </IonCol>
          </IonRow>

          <IonRow className="ion-margin-top">
            <IonCol size="12" sizeMd="6">
              <IonItem>
                <IonLabel position="stacked" className="label-period">
                  Periode
                </IonLabel>
                <IonSelect
                  interface="action-sheet"
                  value={periodPreset}
                  onIonChange={handlePeriodPresetChange}
                  className="custom-select"
                >
                  <IonSelectOption value={PERIOD_PRESETS.LAST_MONTH}>
                    Afgelopen Maand
                  </IonSelectOption>
                  <IonSelectOption value={PERIOD_PRESETS.LAST_THREE_MONTHS}>
                    Afgelopen 3 Maanden
                  </IonSelectOption>
                  <IonSelectOption value={PERIOD_PRESETS.LAST_TWELVE_MONTHS}>
                    Afgelopen 12 Maanden
                  </IonSelectOption>
                  <IonSelectOption value={PERIOD_PRESETS.THIS_YEAR}>
                    Dit Jaar
                  </IonSelectOption>
                  <IonSelectOption value={PERIOD_PRESETS.LAST_YEAR}>
                    Vorig Jaar
                  </IonSelectOption>
                  <IonSelectOption value={PERIOD_PRESETS.CUSTOM}>
                    Aangepaste Periode
                  </IonSelectOption>
                </IonSelect>
              </IonItem>
            </IonCol>
          </IonRow>

          {periodPreset === PERIOD_PRESETS.CUSTOM && (
            <IonRow className="ion-margin-top">
              <IonCol size="12">
                <IonItem>
                  <IonLabel>
                    Aangepaste periode-functionaliteit volgt in toekomstige
                    update
                  </IonLabel>
                </IonItem>
              </IonCol>
            </IonRow>
          )}
        </IonGrid>
      </IonCardContent>
    </IonCard>
  );
};

export default PeriodSelector;
