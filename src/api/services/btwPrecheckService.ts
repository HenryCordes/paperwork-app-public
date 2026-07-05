import { AxiosError } from "axios";

import axiosInstance from "../axiosInstance";
import { ApiError } from "../types";
import {
  BtwPrecheckPreferencesResponse,
  BtwPrecheckPreferencesUpdateRequest,
  BtwPrecheckReportResponse,
  RunBtwPrecheckRequest,
  RunBtwPrecheckResponse,
} from "../types/btwPrecheck";

export class BtwPrecheckAlreadyRunningError extends Error {
  constructor() {
    super("A pre-check is already running for this period");
    this.name = "BtwPrecheckAlreadyRunningError";
  }
}

export class BtwPrecheckDailyCapReachedError extends Error {
  constructor() {
    super("Daily manual pre-check limit reached");
    this.name = "BtwPrecheckDailyCapReachedError";
  }
}

class BtwPrecheckService {
  async getLatestReport(
    period: string,
    year: number
  ): Promise<BtwPrecheckReportResponse | null> {
    try {
      const response = await axiosInstance.get<BtwPrecheckReportResponse>(
        "/btw-precheck/latest",
        { params: { period, year } }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getReport(id: string): Promise<BtwPrecheckReportResponse> {
    const response = await axiosInstance.get<BtwPrecheckReportResponse>(
      `/btw-precheck/${id}`
    );
    return response.data;
  }

  async runPrecheck(
    data: RunBtwPrecheckRequest
  ): Promise<RunBtwPrecheckResponse> {
    try {
      const response = await axiosInstance.post<RunBtwPrecheckResponse>(
        "/btw-precheck/run",
        data
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.status === 409) {
        throw new BtwPrecheckAlreadyRunningError();
      }
      if (axiosError.response?.status === 429) {
        throw new BtwPrecheckDailyCapReachedError();
      }
      throw error;
    }
  }

  async getPreferences(): Promise<BtwPrecheckPreferencesResponse> {
    const response = await axiosInstance.get<BtwPrecheckPreferencesResponse>(
      "/btw-precheck/preferences"
    );
    return response.data;
  }

  async updatePreferences(
    data: BtwPrecheckPreferencesUpdateRequest
  ): Promise<BtwPrecheckPreferencesResponse> {
    const response = await axiosInstance.put<BtwPrecheckPreferencesResponse>(
      "/btw-precheck/preferences",
      data
    );
    return response.data;
  }
}

export default new BtwPrecheckService();
