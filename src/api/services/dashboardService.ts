import axiosInstance from '../axiosInstance';
import { DashboardStatsRequest, DashboardStatsResponse } from '../types/dashboard';

/**
 * Dashboard service for API interactions
 */
const dashboardService = {
  /**
   * Get dashboard statistics
   * 
   * @param params - Dashboard stats request parameters
   * @returns Dashboard stats response
   */
  getDashboardStats: async (params: DashboardStatsRequest): Promise<DashboardStatsResponse> => {
    const response = await axiosInstance.get<DashboardStatsResponse>(
      '/dashboard/stats',
      { params }
    );
    return response.data;
  }
};

export default dashboardService;
