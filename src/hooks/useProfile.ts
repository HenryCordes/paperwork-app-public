import { useQuery, UseQueryResult } from "@tanstack/react-query";
import authService from "../api/services/authService";
import { UserProfile } from "../api/types";
import QueryKeys from "../api/queryKeys";

/**
 * React Query hook for fetching user profile data
 */
export const useProfile = (): UseQueryResult<UserProfile, Error> => {
  return useQuery({
    queryKey: QueryKeys.auth.profile(),
    queryFn: () => authService.getProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: authService.isAuthenticated(),
  });
};

export default useProfile;
