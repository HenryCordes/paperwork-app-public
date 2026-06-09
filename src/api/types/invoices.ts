/**
 * Types for invoices data
 */

export interface InvoiceLine {
  _id: string;
  description: string;
  numberOfItems: number;
  priceIncludingTax: number;
  taxRate: number;
  totalLinePrice: number;
  //OBSOLETE
  priceWOTaxes?: number;
}

export interface Invoice {
  _id: string;
  state: string;
  contactId: string;
  contactName: string;
  invoiceNumber: number;
  invoiceDate: string;
  payDate: string;
  tax?: number;
  taxLow?: number;
  taxLowest?: number;
  priceIncludingTax: number;
  invoiceLines: InvoiceLine[];
  createdAt: string;
  //OBSOLETE
  priceWithoutTaxes?: number;
}

export interface InvoicesResponse {
  success: boolean;
  data: {
    docs: Invoice[];
    totalDocs: number;
    offset: number;
    limit: number;
    totalPages: number;
    page: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage: number | null;
    nextPage: number | null;
  };
}

/**
 * Parameters for querying invoices
 */
export interface InvoicesQueryParams {
  offset?: number;
  limit?: number;
  page?: number;
}

/**
 * Request type for creating or updating an invoice
 */
export interface InvoiceCreateUpdateRequest {
  _id?: string;
  contactId: string;
  contactName: string;
  invoiceNumber: number;
  invoiceDate: string;
  payDate?: string;
  tax?: number;
  taxLow?: number;
  taxLowest?: number;
  priceIncludingTax: number;
  invoiceLines: InvoiceLine[];
  state?: string;
  //OBSOLETE
  priceWithoutTaxes?: number;
}
