export type TaxPeriodType = "monthly" | "quarterly" | "yearly";

export interface TaxPeriod {
  value: string | number;
  label: string;
}

export interface TaxPeriodTypeOption {
  value: TaxPeriodType;
  label: string;
}

export interface TaxPeriodsResponse {
  success: boolean;
  data: {
    periodTypes: TaxPeriodTypeOption[];
    periods: {
      monthly: TaxPeriod[];
      quarterly: TaxPeriod[];
      yearly: TaxPeriod[];
    };
    years: number[];
  };
}

export interface TaxSummaryRequest {
  periodType: TaxPeriodType;
  period: string;
  year: number;
}

export interface TaxRateData {
  basis: number;
  btw: number;
}

export interface TaxSummaryData {
  period: {
    type: TaxPeriodType;
    period: string;
    year: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
  omzet: {
    hoogTarief21: TaxRateData;
    laagTarief9: TaxRateData;
    laagsteTarief6: TaxRateData;
    overige: TaxRateData;
  };
  voorbelasting: {
    totaal: number;
  };
  teBetalen: number;
  invoiceCount: number;
  expenseCount: number;
}

export interface TaxSummaryResponse {
  success: boolean;
  data: TaxSummaryData;
}

export interface TaxExportRequest {
  periodType: TaxPeriodType;
  period: string;
  year: number;
  format: "excel" | "csv";
  includeDetails: boolean;
}

export interface TaxDeadline {
  deadline: string;
  label: string;
  daysUntilDeadline: number;
  periodType: TaxPeriodType;
}

export interface TaxDeadlineResponse {
  success: boolean;
  data: TaxDeadline;
}
