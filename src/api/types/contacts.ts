export interface Contact {
  _id: string;
  contactNumber: number;
  companyName: string;
  typeOfContact: string;
  lastName: string;
  firstName: string;
  initials: string;
  gender?: string;
  emailAddress: string;
  phoneNumber: string;
  mobilePhoneNumber: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  visitingStreet: string;
  visitingHouseNumber: string;
  visitingPostalCode: string;
  visitingCity: string;
  visitingCountry: string;
  bankIBAN: string;
  bankPersonName: string;
  channel: string;
  history: string;
  typeName: string;
  owner: string;
  createdAt: string;
  tenantId: string;
  id: string;
}

export interface ContactsResponse {
  success: boolean;
  data: {
    docs: Contact[];
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

export interface ContactsQueryParams {
  offset: number;
}

/**
 * Interface for creating or updating a contact
 */
export interface ContactCreateUpdateRequest {
  _id?: string;
  companyName: string;
  typeOfContact: string;
  typeName: string;
  lastName: string;
  firstName: string;
  initials: string;
  gender?: string;
  emailAddress: string;
  phoneNumber?: string;
  mobilePhoneNumber?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  visitingStreet?: string;
  visitingHouseNumber?: string;
  visitingPostalCode?: string;
  visitingCity?: string;
  visitingCountry?: string;
  bankIBAN?: string;
  bankPersonName?: string;
}
