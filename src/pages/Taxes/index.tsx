import React, { useState, useEffect } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonToggle,
  IonSpinner,
  IonText,
} from "@ionic/react";
import {
  useTaxPeriods,
  useTaxSummary,
  useExportTaxReturn,
} from "../../hooks/useTaxes";
import { TaxPeriodType } from "../../api/types/taxes";
import MenuButton from "../../components/MenuButton";
import VatReturnDeadlineCard from "../../components/VatReturnDeadlineCard";
import { useToast } from "../../hooks/useToast";
import "./Taxes.css";

const TaxesPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { showToast } = useToast();

  const [selectedPeriodType, setSelectedPeriodType] =
    useState<TaxPeriodType>("quarterly");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<"excel" | "csv">(
    "excel"
  );
  const [includeDetails, setIncludeDetails] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: periodsData, isLoading: isLoadingPeriods } = useTaxPeriods();

  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useTaxSummary(
    {
      periodType: selectedPeriodType,
      period: selectedPeriod,
      year: selectedYear,
    },
    showPreview
  );

  const exportMutation = useExportTaxReturn();

  useEffect(() => {
    if (periodsData && selectedPeriodType) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentQuarter = Math.ceil(currentMonth / 3);

      if (selectedPeriodType === "monthly") {
        setSelectedPeriod(currentMonth.toString());
      } else if (selectedPeriodType === "quarterly") {
        setSelectedPeriod(`Q${currentQuarter}`);
      } else if (selectedPeriodType === "yearly") {
        setSelectedPeriod(selectedYear.toString());
      }
    }
  }, [selectedPeriodType, periodsData, selectedYear]);

  const handlePreview = async () => {
    if (!selectedPeriod || !selectedYear) {
      return;
    }
    setShowPreview(true);
    await refetchSummary();
  };

  const handleExport = async () => {
    if (!selectedPeriod || !selectedYear) {
      return;
    }

    try {
      const result = await exportMutation.mutateAsync({
        periodType: selectedPeriodType,
        period: selectedPeriod,
        year: selectedYear,
        format: selectedFormat,
        includeDetails,
      });

      if (result.message) {
        showToast(result.message, "success");
      }
    } catch {
      showToast("Fout bij exporteren van bestand", "error");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nl-NL");
  };

  const getPeriodLabel = () => {
    if (!periodsData || !selectedPeriod) return "";

    if (selectedPeriodType === "monthly") {
      const month = periodsData.data.periods.monthly.find(
        (m) => m.value.toString() === selectedPeriod
      );
      return month ? month.label : selectedPeriod;
    } else if (selectedPeriodType === "quarterly") {
      const quarter = periodsData.data.periods.quarterly.find(
        (q) => q.value === selectedPeriod
      );
      return quarter ? quarter.label : selectedPeriod;
    } else {
      return `Jaar ${selectedYear}`;
    }
  };

  if (isLoadingPeriods) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <MenuButton />
            <IonTitle>BTW</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="loading-container">
            <IonSpinner />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <MenuButton />
          <IonTitle>Belasting</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <VatReturnDeadlineCard variant="full" />

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>BTW Aangifte Export</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonText color="medium">
              <p>
                Exporteer uw BTW gegevens voor maandelijkse, kwartaal of
                jaarlijkse aangiftes. Alle bedragen worden automatisch berekend
                op basis van uw facturen en uitgaven.
              </p>
            </IonText>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Export Instellingen</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">Periode Type</IonLabel>
              <IonSelect
                value={selectedPeriodType}
                onIonChange={(e) => {
                  setSelectedPeriodType(e.detail.value);
                  setShowPreview(false);
                }}
              >
                {periodsData?.data.periodTypes.map((type) => (
                  <IonSelectOption key={type.value} value={type.value}>
                    {type.label}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Jaar</IonLabel>
              <IonSelect
                value={selectedYear}
                onIonChange={(e) => {
                  setSelectedYear(e.detail.value);
                  setShowPreview(false);
                }}
              >
                {periodsData?.data.years.map((year) => (
                  <IonSelectOption key={year} value={year}>
                    {year}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Periode</IonLabel>
              <IonSelect
                value={selectedPeriod}
                onIonChange={(e) => {
                  setSelectedPeriod(e.detail.value);
                  setShowPreview(false);
                }}
              >
                {selectedPeriodType !== "yearly" &&
                  periodsData?.data.periods[selectedPeriodType]?.map(
                    (period) => (
                      <IonSelectOption key={period.value} value={period.value}>
                        {period.label}
                      </IonSelectOption>
                    )
                  )}
                {selectedPeriodType === "yearly" && (
                  <IonSelectOption value={selectedYear}>
                    Jaar {selectedYear}
                  </IonSelectOption>
                )}
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Export Formaat</IonLabel>
              <IonSelect
                value={selectedFormat}
                onIonChange={(e) => setSelectedFormat(e.detail.value)}
              >
                <IonSelectOption value="excel">Excel (.xlsx)</IonSelectOption>
                <IonSelectOption value="csv">CSV (.csv)</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem lines="none">
              <IonLabel>Inclusief gedetailleerde lijsten</IonLabel>
              <IonToggle
                checked={includeDetails}
                onIonChange={(e) => setIncludeDetails(e.detail.checked)}
              />
            </IonItem>

            <div className="button-group">
              <IonButton
                expand="block"
                fill="outline"
                onClick={handlePreview}
                disabled={!selectedPeriod || isLoadingSummary}
              >
                {isLoadingSummary ? <IonSpinner /> : "Voorvertoning"}
              </IonButton>
              <IonButton
                expand="block"
                onClick={handleExport}
                disabled={!selectedPeriod || exportMutation.isPending}
              >
                {exportMutation.isPending ? <IonSpinner /> : "Exporteren"}
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>

        {showPreview && summaryData && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                Voorvertoning - {getPeriodLabel()} {selectedYear}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="summary-section">
                <h3>BTW Overzicht</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="label">Hoog tarief (21%):</span>
                    <span className="value">
                      {formatCurrency(summaryData.data.omzet.hoogTarief21.btw)}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Laag tarief (9%):</span>
                    <span className="value">
                      {formatCurrency(summaryData.data.omzet.laagTarief9.btw)}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Laagste tarief (6%):</span>
                    <span className="value">
                      {formatCurrency(
                        summaryData.data.omzet.laagsteTarief6.btw
                      )}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Overige/verlegd (0%):</span>
                    <span className="value">
                      {formatCurrency(summaryData.data.omzet.overige.btw)}
                    </span>
                  </div>
                  <div className="summary-item total">
                    <span className="label">Totaal te betalen BTW:</span>
                    <span className="value">
                      {formatCurrency(summaryData.data.teBetalen)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="period-info">
                <h3>Periode Informatie</h3>
                <IonItem lines="none">
                  <IonLabel>
                    <strong>Periode:</strong> {getPeriodLabel()} {selectedYear}
                  </IonLabel>
                </IonItem>
                <IonItem lines="none">
                  <IonLabel>
                    <strong>Van:</strong>{" "}
                    {formatDate(summaryData.data.period.dateRange.start)}
                  </IonLabel>
                </IonItem>
                <IonItem lines="none">
                  <IonLabel>
                    <strong>Tot:</strong>{" "}
                    {formatDate(summaryData.data.period.dateRange.end)}
                  </IonLabel>
                </IonItem>
                <IonItem lines="none">
                  <IonLabel>
                    <strong>Facturen:</strong> {summaryData.data.invoiceCount}
                  </IonLabel>
                </IonItem>
                <IonItem lines="none">
                  <IonLabel>
                    <strong>Uitgaven:</strong> {summaryData.data.expenseCount}
                  </IonLabel>
                </IonItem>
              </div>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default TaxesPage;
