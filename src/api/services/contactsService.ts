import { AxiosInstance } from "axios";
import {
  ContactsResponse,
  ContactsQueryParams,
  Contact,
  ContactCreateUpdateRequest,
} from "../types/contacts";
import axiosInstance from "../axiosInstance";

/**
 * Service for managing contacts-related API calls
 */
class ContactsService {
  private axios: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axios = axiosInstance;
  }
  /**
   * Get list of contacts with pagination
   * @param params - Query parameters for pagination
   */
  async getContacts(
    params: ContactsQueryParams = { offset: 0 }
  ): Promise<ContactsResponse> {
    const response = await this.axios.get<ContactsResponse>(
      `contacts?offset=${params.offset}`
    );
    return response.data;
  }

  /**
   * Get contact by ID
   * @param id - Contact ID
   */
  async getContactById(
    id: string
  ): Promise<{ success: boolean; data: Contact }> {
    const response = await this.axios.get<{ success: boolean; data: Contact }>(
      `contact/${id}`
    );
    return response.data;
  }

  /**
   * Create or update a contact
   * @param contactData - The contact data to create or update (includes _id for updates)
   * @returns The created or updated contact
   */
  async createOrUpdateContact(
    contactData: ContactCreateUpdateRequest
  ): Promise<{ success: boolean; data: Contact }> {
    const response = await this.axios.post<{ success: boolean; data: Contact }>(
      "contact",
      contactData
    );
    return response.data;
  }

  /**
   * Delete a contact
   * @param id - Contact ID
   */
  async deleteContact(id: string): Promise<{ success: boolean }> {
    const response = await this.axios.delete<{ success: boolean }>(
      `contact/${id}`
    );
    return response.data;
  }
}

// Create and export a default instance of ContactsService
const contactsService = new ContactsService(axiosInstance);

export default contactsService;
