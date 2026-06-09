import axiosInstance from "../axiosInstance";
import {
  TaxPeriodsResponse,
  TaxSummaryRequest,
  TaxSummaryResponse,
  TaxExportRequest,
  TaxDeadlineResponse,
  TaxPeriodType,
} from "../types/taxes";

class TaxesService {
  async getTaxPeriods(): Promise<TaxPeriodsResponse> {
    const response = await axiosInstance.get<TaxPeriodsResponse>(
      "/btw-export/periods"
    );
    return response.data;
  }

  async getTaxSummary(params: TaxSummaryRequest): Promise<TaxSummaryResponse> {
    const response = await axiosInstance.get<TaxSummaryResponse>(
      "/btw-export/summary",
      { params }
    );
    return response.data;
  }

  async exportTaxReturn(params: TaxExportRequest): Promise<Blob> {
    const response = await axiosInstance.get("/btw-export/export", {
      params,
      responseType: "blob",
    });
    return response.data;
  }

  async getNextDeadline(
    periodType: TaxPeriodType = "quarterly"
  ): Promise<TaxDeadlineResponse> {
    const response = await axiosInstance.get<TaxDeadlineResponse>(
      "/btw-export/deadline",
      { params: { periodType } }
    );
    return response.data;
  }
}

export default new TaxesService();
