import React from "react";
import { IonCard, IonCardContent } from "@ionic/react";
import { useHistory } from "react-router-dom";
import { useTaxDeadline } from "../../hooks/useTaxes";
import { useVatNotificationPreferences } from "../../hooks/useVatNotificationPreferences";
import { TaxPeriodType } from "../../api/types/taxes";
import "./VatReturnDeadlineCard.css";

interface VatReturnDeadlineCardProps {
  variant?: "full" | "compact";
}

const VatReturnDeadlineCard: React.FC<VatReturnDeadlineCardProps> = ({
  variant = "full",
}) => {
  const history = useHistory();
  const { data: preferencesData } = useVatNotificationPreferences();

  const getPrimaryPeriodType = (): TaxPeriodType => {
    if (!preferencesData?.data) return "quarterly";

    const prefs = preferencesData.data;
    if (prefs.quarterlyNotifications) return "quarterly";
    if (prefs.monthlyNotifications) return "monthly";
    if (prefs.yearlyNotifications) return "yearly";
    return "quarterly";
  };

  const periodType = getPrimaryPeriodType();
  const { data: deadlineData, isLoading } = useTaxDeadline(periodType);

  if (isLoading || !deadlineData) {
    return null;
  }

  const { deadline, label, daysUntilDeadline } = deadlineData.data;

  if (daysUntilDeadline > 14) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getUrgencyClass = () => {
    if (daysUntilDeadline <= 3) return "urgent";
    if (daysUntilDeadline <= 7) return "warning";
    return "info";
  };

  const handleClick = () => {
    history.push("/taxes");
  };

  if (variant === "compact") {
    return (
      <IonCard
        className={`vat-deadline-card compact ${getUrgencyClass()}`}
        button
        onClick={handleClick}
      >
        <IonCardContent>
          <div className="compact-content">
            <div className="icon-section">
              <span className="deadline-icon">⏰</span>
            </div>
            <div className="text-section">
              <div className="deadline-title">BTW Deadline</div>
              <div className="deadline-date">{formatDate(deadline)}</div>
              <div className="deadline-days">
                {daysUntilDeadline} {daysUntilDeadline === 1 ? "dag" : "dagen"}{" "}
                resterend
              </div>
            </div>
          </div>
        </IonCardContent>
      </IonCard>
    );
  }

  return (
    <IonCard
      className={`vat-deadline-card full ${getUrgencyClass()}`}
      button
      onClick={handleClick}
    >
      <IonCardContent>
        <div className="deadline-content">
          <span className="deadline-icon">⏰</span>
          <div className="deadline-text">
            <strong>Volgende BTW Deadline</strong>
            <div className="deadline-details">
              {formatDate(deadline)} - {label}
              <br />
              <small>
                {daysUntilDeadline} {daysUntilDeadline === 1 ? "dag" : "dagen"}{" "}
                resterend
              </small>
            </div>
          </div>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default VatReturnDeadlineCard;
