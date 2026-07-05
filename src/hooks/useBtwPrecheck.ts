import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";

import btwPrecheckService from "../api/services/btwPrecheckService";
import QueryKeys from "../api/queryKeys";
import {
  BtwPrecheckPreferencesResponse,
  BtwPrecheckPreferencesUpdateRequest,
  BtwPrecheckReportResponse,
  RunBtwPrecheckRequest,
} from "../api/types/btwPrecheck";

/**
 * Poll every 3 seconds while the latest report is running, otherwise don't
 * poll. Extracted as a standalone function so it can be unit-tested directly
 * against a plain { state: { data } } shape, without driving fake timers
 * through TanStack Query's own refetch scheduling.
 */
export function getBtwPrecheckRefetchInterval(query: {
  state: { data?: BtwPrecheckReportResponse | null };
}): number | false {
  const status = query.state.data?.data?.status;
  return status === "running" ? 3000 : false;
}

export const useBtwPrecheckLatestReport = (
  period: string,
  year: number
): UseQueryResult<BtwPrecheckReportResponse | null, Error> => {
  return useQuery({
    queryKey: QueryKeys.btwPrecheck.latest(period, year),
    queryFn: () => btwPrecheckService.getLatestReport(period, year),
    refetchInterval: getBtwPrecheckRefetchInterval,
  });
};

export const useRunBtwPrecheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RunBtwPrecheckRequest) =>
      btwPrecheckService.runPrecheck(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.btwPrecheck.latest(
          variables.period,
          variables.year
        ),
      });
    },
  });
};

export const useBtwPrecheckPreferences = (): UseQueryResult<
  BtwPrecheckPreferencesResponse,
  Error
> => {
  return useQuery({
    queryKey: QueryKeys.btwPrecheck.preferences(),
    queryFn: () => btwPrecheckService.getPreferences(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useUpdateBtwPrecheckPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BtwPrecheckPreferencesUpdateRequest) =>
      btwPrecheckService.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.btwPrecheck.preferences(),
      });
    },
  });
};
