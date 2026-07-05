import React from "react";
import { useHistory } from "react-router-dom";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonSpinner,
  IonText,
} from "@ionic/react";
import { alertCircleOutline, informationCircleOutline } from "ionicons/icons";
import { AxiosError } from "axios";

import {
  useBtwPrecheckLatestReport,
  useRunBtwPrecheck,
} from "../../hooks/useBtwPrecheck";
import {
  BtwPrecheckAlreadyRunningError,
  BtwPrecheckDailyCapReachedError,
} from "../../api/services/btwPrecheckService";
import { useToast } from "../../hooks/useToast";
import type { Finding } from "../../api/types/btwPrecheck";

interface BtwPrecheckReportCardProps {
  period: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
}

const isTappable = (finding: Finding): boolean =>
  finding.entityId !== null &&
  (finding.entityType === "expense" || finding.entityType === "invoice");

const BtwPrecheckReportCard: React.FC<BtwPrecheckReportCardProps> = ({
  period,
  year,
}) => {
  const history = useHistory();
  const { showToast } = useToast();
  const { data, isLoading, isError, error } = useBtwPrecheckLatestReport(
    period,
    year
  );
  const runMutation = useRunBtwPrecheck();

  const isBusy = runMutation.isPending || data?.data?.status === "running";
  const buttonLabel = isBusy ? "Bezig met controle..." : "Controleer nu";

  const handleFindingClick = (finding: Finding) => {
    if (!isTappable(finding)) return;
    if (finding.entityType === "expense") {
      history.push(`/expenses/${finding.entityId}`);
    } else if (finding.entityType === "invoice") {
      history.push(`/invoices/${finding.entityId}`);
    }
  };

  const handleRunNow = () => {
    runMutation.mutate(
      { period, year },
      {
        onError: (mutationError: Error) => {
          if (mutationError instanceof BtwPrecheckAlreadyRunningError) {
            showToast("Er loopt al een controle voor dit kwartaal.", "info");
          } else if (mutationError instanceof BtwPrecheckDailyCapReachedError) {
            showToast(
              "Maximaal aantal handmatige controles per dag bereikt.",
              "info"
            );
          } else {
            showToast("Kon de controle niet starten.", "error");
          }
        },
      }
    );
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="ion-text-center">
          <IonSpinner />
        </div>
      );
    }

    if (isError) {
      const status = (error as AxiosError)?.response?.status;
      if (status === 503) {
        return (
          <IonText color="medium">
            <p>BTW pre-check is momenteel niet beschikbaar.</p>
          </IonText>
        );
      }
      return (
        <IonText color="danger">
          <p>Kon de controle niet laden.</p>
        </IonText>
      );
    }

    const report = data?.data;

    if (!report) {
      return (
        <>
          <IonText color="medium">
            <p>Nog geen controle uitgevoerd voor dit kwartaal.</p>
          </IonText>
          <IonButton
            expand="block"
            onClick={handleRunNow}
            disabled={isBusy}
          >
            {buttonLabel}
          </IonButton>
        </>
      );
    }

    if (report.status === "running") {
      return (
        <>
          <div className="ion-text-center">
            <IonSpinner />
            <p>Bezig met controleren...</p>
          </div>
          <IonButton expand="block" disabled={isBusy}>
            {buttonLabel}
          </IonButton>
        </>
      );
    }

    if (report.status === "failed") {
      return (
        <>
          <IonText color="danger">
            <p>De controle is mislukt. Probeer het opnieuw.</p>
          </IonText>
          <IonButton
            expand="block"
            onClick={handleRunNow}
            disabled={isBusy}
          >
            {buttonLabel}
          </IonButton>
        </>
      );
    }

    return (
      <>
        {report.findings.length === 0 ? (
          <IonText color="medium">
            <p>Geen aandachtspunten gevonden.</p>
          </IonText>
        ) : (
          report.findings.map((finding, index) => {
            const tappable = isTappable(finding);
            return (
              <IonItem
                key={index}
                button={tappable}
                onClick={tappable ? () => handleFindingClick(finding) : undefined}
              >
                <IonIcon
                  slot="start"
                  color={finding.severity === "warning" ? "warning" : "medium"}
                  icon={
                    finding.severity === "warning"
                      ? alertCircleOutline
                      : informationCircleOutline
                  }
                />
                <IonLabel className="ion-text-wrap">
                  {finding.messageNl}
                </IonLabel>
              </IonItem>
            );
          })
        )}
        <IonButton expand="block" onClick={handleRunNow} disabled={isBusy}>
          {buttonLabel}
        </IonButton>
      </>
    );
  };

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>BTW Pre-Check</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>{renderBody()}</IonCardContent>
    </IonCard>
  );
};

export default BtwPrecheckReportCard;
