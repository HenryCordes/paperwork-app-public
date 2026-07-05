export type FindingCode =
  | "MISSING_DOCUMENT"
  | "VAT_ARITHMETIC_MISMATCH"
  | "VAT_RATE_UNUSUAL"
  | "DUPLICATE_SUSPECTED"
  | "HISTORY_ANOMALY"
  | "NO_ACTIVITY";

export interface Finding {
  code: FindingCode;
  severity: "warning" | "info";
  messageNl: string;
  messageEn: string;
  entityType: "expense" | "invoice" | "period";
  entityId: string | null;
  meta: Record<string, unknown>;
}

export interface BtwPrecheckReport {
  _id: string;
  tenantId: string;
  periodType: "quarterly";
  period: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
  status: "running" | "completed" | "failed";
  trigger: "scheduled" | "manual";
  findings: Finding[];
  meta: {
    model?: string | null;
    tokensUsed?: { input: number; output: number } | null;
    toolCalls?: number | null;
    latencyMs?: number | null;
    anomalyStatus:
      | "pending"
      | "completed"
      | "failed"
      | "skipped_insufficient_history"
      | "disabled";
  };
  createdAt: string;
  updatedAt: string;
}

export interface BtwPrecheckReportResponse {
  success: boolean;
  data: BtwPrecheckReport;
}

export interface RunBtwPrecheckRequest {
  period: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
}

export interface RunBtwPrecheckResponse {
  success: boolean;
  data: { reportId: string; status: "running" };
}

export interface BtwPrecheckPreferences {
  _id: string;
  userId: string;
  tenantId: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  pushNotifications: boolean;
  preferredLanguage: "nl" | "en";
  createdAt: string;
  updatedAt: string;
}

export interface BtwPrecheckPreferencesResponse {
  success: boolean;
  data: BtwPrecheckPreferences;
}

export interface BtwPrecheckPreferencesUpdateRequest {
  emailNotifications?: boolean;
  inAppNotifications?: boolean;
  pushNotifications?: boolean;
}
