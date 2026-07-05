import axiosInstance from "../axiosInstance";
import {
  VatNotificationPreferencesResponse,
  VatNotificationPreferencesUpdateRequest,
} from "../types/vatNotificationPreferences";

class VatNotificationPreferencesService {
  async getPreferences(): Promise<VatNotificationPreferencesResponse> {
    const response =
      await axiosInstance.get<VatNotificationPreferencesResponse>(
        "/vat-return-notifications/preferences"
      );
    return response.data;
  }

  async updatePreferences(
    data: VatNotificationPreferencesUpdateRequest
  ): Promise<VatNotificationPreferencesResponse> {
    const response =
      await axiosInstance.put<VatNotificationPreferencesResponse>(
        "/vat-return-notifications/preferences",
        data
      );
    return response.data;
  }
}

export default new VatNotificationPreferencesService();
