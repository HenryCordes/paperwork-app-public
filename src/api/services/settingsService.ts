import { AxiosInstance } from "axios";
import { SettingsResponse, SettingsUpdateRequest } from "../types/settings";
import axiosInstance from "../axiosInstance";

/**
 * Service for managing settings-related API calls
 */
class SettingsService {
  private axios: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axios = axiosInstance;
  }

  /**
   * Get company settings
   */
  async getSettings(): Promise<SettingsResponse> {
    const response = await this.axios.get<SettingsResponse>("settings");
    return response.data;
  }

  /**
   * Update company settings
   * @param settings - Updated settings data
   */
  async updateSettings(
    settings: SettingsUpdateRequest
  ): Promise<SettingsResponse> {
    const response = await this.axios.post<SettingsResponse>(
      "settings",
      settings
    );
    return response.data;
  }
}

// Create and export a default instance of SettingsService
const settingsService = new SettingsService(axiosInstance);

export default settingsService;
