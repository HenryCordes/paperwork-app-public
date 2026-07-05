export interface Settings {
  _id: string;
  country: string;
  currency: string;
  companyName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  phoneNumber: string;
  companyEmail: string;
  taxNumber: string;
  chamberOfCommerceNumber: string;
  bankName: string;
  bankIBAN: string;
  taxPercentage: string;
  createdAt: string;
  tenantId: string;
  __v: number;
  agbCode: string;
  companyLogo: string;
  registerNumber: string;
  website: string;
  btwPrecheck?: {
    missingDocuments: boolean;
    vatArithmetic: boolean;
    duplicates: boolean;
    historyAnomalies: boolean;
  };
}

export interface SettingsResponse {
  success: boolean;
  data: Settings;
}

/**
 * Interface for updating settings
 */
export interface SettingsUpdateRequest {
  country?: string;
  currency?: string;
  companyName?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  phoneNumber?: string;
  companyEmail?: string;
  taxNumber?: string;
  chamberOfCommerceNumber?: string;
  bankName?: string;
  bankIBAN?: string;
  taxPercentage?: string;
  agbCode?: string;
  registerNumber?: string;
  website?: string;
  companyLogo?: string;
  btwPrecheck?: {
    missingDocuments: boolean;
    vatArithmetic: boolean;
    duplicates: boolean;
    historyAnomalies: boolean;
  };
}
