import React, { useState } from "react";
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonCardTitle,
  IonSkeletonText,
  useIonViewWillEnter,
  IonButton,
  IonIcon,
} from "@ionic/react";
import { funnel } from "ionicons/icons";
import { useDashboardStats } from "../../hooks/useDashboard";
import { useDarkMode } from "../../hooks/useDarkMode";
import { PeriodType, PeriodPreset } from "../../api/types/dashboard";
import {
  PERIOD_PRESETS,
  PERIOD_TYPES,
} from "../../api/types/dashboard-constants";
import FinancialChart from "./components/FinancialChart";
import PeriodSelector from "./components/PeriodSelector";
import PieChart from "./components/PieChart";
import "./Dashboard.css";
import MenuButton from "../../components/MenuButton";
import VatReturnDeadlineCard from "../../components/VatReturnDeadlineCard";
import { CardSubtitle, DashboardChartContainer, SingleValue } from "./styled";
import { MIN_SCREEN_WIDTH } from "../../common/versionConstants";

const Dashboard: React.FC = () => {
  const isDarkMode = useDarkMode();
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);

  const [periodType, setPeriodType] = useState<PeriodType>(
    PERIOD_TYPES.MONTHLY as PeriodType
  );
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(
    PERIOD_PRESETS.THIS_YEAR as PeriodPreset
  );

  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
    refetch,
  } = useDashboardStats({
    periodType,
    periodPreset,
  });

  useIonViewWillEnter(() => {
    refetch();
  });

  const handlePeriodChange = (type: PeriodType, preset: PeriodPreset) => {
    setPeriodType(type);
    setPeriodPreset(preset);

    refetch();
  };

  const calculateSummary = () => {
    if (
      !dashboardData?.data?.rawData ||
      !Array.isArray(dashboardData.data.rawData)
    ) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
      };
    }

    const summary = dashboardData.data.rawData.reduce(
      (acc, dataPoint) => {
        return {
          totalRevenue: acc.totalRevenue + (dataPoint.totalRevenue || 0),
          totalExpenses: acc.totalExpenses + (dataPoint.totalExpenses || 0),
          netProfit: acc.netProfit + (dataPoint.netProfit || 0),
        };
      },
      { totalRevenue: 0, totalExpenses: 0, netProfit: 0 }
    );

    return summary;
  };

  const summary = calculateSummary();

  const getPeriodLabel = () => {
    if (periodPreset === PERIOD_PRESETS.LAST_MONTH)
      return "Overzicht Afgelopen Maand";
    if (periodPreset === PERIOD_PRESETS.LAST_THREE_MONTHS)
      return "Overzicht Afgelopen 3 Maanden";
    if (periodPreset === PERIOD_PRESETS.LAST_TWELVE_MONTHS)
      return "Overzicht Afgelopen 12 Maanden";
    if (periodPreset === PERIOD_PRESETS.THIS_YEAR) return "Overzicht Dit Jaar";
    if (periodPreset === PERIOD_PRESETS.LAST_YEAR)
      return "Overzicht Vorig Jaar";
    if (periodPreset === PERIOD_PRESETS.CUSTOM) return "Aangepaste Periode";

    switch (periodType) {
      case PERIOD_TYPES.DAILY:
        return "Dagelijks Overzicht";
      case PERIOD_TYPES.MONTHLY:
        return "Maandelijks Overzicht";
      case PERIOD_TYPES.QUARTERLY:
        return "Kwartaal Overzicht";
      case PERIOD_TYPES.YEARLY:
        return "Jaarlijks Overzicht";
      default:
        return "Financieel Overzicht";
    }
  };

  const isSmallScreen = window.innerWidth < MIN_SCREEN_WIDTH;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <MenuButton />
          <IonTitle>Dashboard</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={() => setShowPeriodSelector(!showPeriodSelector)}
            >
              <IonIcon icon={funnel} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className={isDarkMode ? "dark-theme" : ""}>
        <div className="small-title">{getPeriodLabel()}</div>

        <IonGrid>
          {showPeriodSelector && (
            <IonRow>
              <IonCol size="12">
                <PeriodSelector
                  periodType={periodType}
                  periodPreset={periodPreset}
                  onPeriodChange={handlePeriodChange}
                />
              </IonCol>
            </IonRow>
          )}

          {isLoading ? (
            <IonRow>
              <IonCol size="12">
                <div className="ion-padding">
                  <IonSkeletonText
                    animated
                    style={{ width: "100%", height: "200px" }}
                  />
                  <IonSkeletonText
                    animated
                    style={{
                      width: "100%",
                      height: "100px",
                      marginTop: "20px",
                    }}
                  />
                </div>
              </IonCol>
            </IonRow>
          ) : isError ? (
            <IonRow>
              <IonCol size="12">
                <IonCard color="danger">
                  <IonCardHeader>
                    <IonCardTitle>Fout bij het laden</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {error instanceof Error
                      ? error.message
                      : "Kan dashboardgegevens niet laden. Probeer het opnieuw."}
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          ) : (
            <>
              {/* Financial Stats Summary - Three single values */}
              <IonRow>
                <IonCol size="4" sizeSm="4">
                  <IonCard className="ion-text-center small">
                    <IonCardHeader>
                      <CardSubtitle color="primary" smallScreen={isSmallScreen}>
                        Omzet
                      </CardSubtitle>
                    </IonCardHeader>
                    <IonCardContent className="small">
                      <SingleValue smallScreen={isSmallScreen}>
                        {summary &&
                          new Intl.NumberFormat("nl-NL", {
                            style: "currency",
                            currency: "EUR",
                          }).format(summary.totalRevenue)}
                      </SingleValue>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="4" sizeSm="4">
                  <IonCard className="ion-text-center small">
                    <IonCardHeader>
                      <CardSubtitle color="danger" smallScreen={isSmallScreen}>
                        Uitgaven
                      </CardSubtitle>
                    </IonCardHeader>
                    <IonCardContent className="small">
                      <SingleValue smallScreen={isSmallScreen}>
                        {summary &&
                          new Intl.NumberFormat("nl-NL", {
                            style: "currency",
                            currency: "EUR",
                          }).format(summary.totalExpenses)}
                      </SingleValue>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="4" sizeSm="4">
                  <IonCard className="ion-text-center small">
                    <IonCardHeader>
                      <CardSubtitle
                        color={
                          summary && summary.netProfit >= 0
                            ? "success"
                            : "danger"
                        }
                        smallScreen={isSmallScreen}
                      >
                        {summary && summary.netProfit >= 0
                          ? "Winst"
                          : "Verlies"}
                      </CardSubtitle>
                    </IonCardHeader>
                    <IonCardContent className="small">
                      <SingleValue smallScreen={isSmallScreen}>
                        {summary &&
                          new Intl.NumberFormat("nl-NL", {
                            style: "currency",
                            currency: "EUR",
                          }).format(summary.netProfit)}
                      </SingleValue>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>

              <VatReturnDeadlineCard variant="compact" />

              <IonRow>
                <IonCol size="12" sizeMd="8">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>{getPeriodLabel()}</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <DashboardChartContainer>
                        {dashboardData?.data && (
                          <FinancialChart
                            chartData={{
                              turnover: dashboardData.data.turnover,
                              expenses: dashboardData.data.expenses,
                            }}
                            labels={dashboardData.data.labels}
                            isDarkMode={isDarkMode}
                          />
                        )}
                      </DashboardChartContainer>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                <IonCol size="12" sizeMd="4">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Omzet vs Uitgaven</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ minHeight: "250px" }}>
                        {dashboardData?.data?.rawData && (
                          <PieChart
                            revenue={summary.totalRevenue}
                            expenses={summary.totalExpenses}
                            isDarkMode={isDarkMode}
                          />
                        )}
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </>
          )}
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
