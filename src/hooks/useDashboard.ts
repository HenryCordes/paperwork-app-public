import { useQuery, UseQueryResult } from "@tanstack/react-query";
import dashboardService from "../api/services/dashboardService";
import {
  DashboardStatsRequest,
  DashboardStatsResponse,
} from "../api/types/dashboard";

export const DASHBOARD_STATS_KEY = "dashboardStats";

export const useDashboardStats = ({
  periodType,
  periodPreset,
  startDate,
  endDate,
  year,
}: DashboardStatsRequest = {}): UseQueryResult<
  DashboardStatsResponse,
  Error
> => {
  const params: DashboardStatsRequest = {};
  if (periodType) params.periodType = periodType;
  if (periodPreset) params.periodPreset = periodPreset;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (year) params.year = year;

  return useQuery({
    queryKey: [DASHBOARD_STATS_KEY, params],
    queryFn: async () => {
      const response = await dashboardService.getDashboardStats(params);
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });
};
