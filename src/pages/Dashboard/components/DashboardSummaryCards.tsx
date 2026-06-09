import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { formatCurrency } from '../../../utils/formatters';

interface DashboardSummaryCardsProps {
  summary?: {
    totalRevenue: number;
    paidRevenue: number;
    unpaidRevenue: number;
    totalExpenses: number;
    paidExpenses: number;
    unpaidExpenses: number;
    netProfit: number;
    invoiceCount: number;
    expenseCount: number;
  };
}

const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({ summary }) => {
  if (!summary) return null;

  const cards = [
    {
      label: 'Omzet',
      value: formatCurrency(summary.totalRevenue),
      color: 'primary',
    },
    {
      label: 'Uitgaven',
      value: formatCurrency(summary.totalExpenses),
      color: 'tertiary',
    },
    {
      label: summary.netProfit >= 0 ? 'Winst' : 'Verlies',
      value: formatCurrency(Math.abs(summary.netProfit)),
      color: summary.netProfit >= 0 ? 'success' : 'danger',
    },
  ];

  return (
    <IonGrid>
      <IonRow>
        {cards.map((card, index) => (
          <IonCol key={index} size="6" sizeMd="3">
            <IonCard className="dashboard-summary-card" color={card.color}>
              <IonCardContent className="ion-text-center">
                <div className="dashboard-summary-value">{card.value}</div>
                <div className="dashboard-summary-label">{card.label}</div>
              </IonCardContent>
            </IonCard>
          </IonCol>
        ))}
      </IonRow>
    </IonGrid>
  );
};

export default DashboardSummaryCards;
