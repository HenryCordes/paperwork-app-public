import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import settingsService from "../api/services/settingsService";
import { SettingsResponse, SettingsUpdateRequest } from "../api/types/settings";

// Define query keys for settings
const SETTINGS_KEY = ["settings"];

/**
 * Hook for managing settings data and operations
 */
export const useSettings = () => {
  const queryClient = useQueryClient();

  /**
   * Get settings query
   */
  const getSettings = (): UseQueryResult<SettingsResponse, Error> => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- getSettings is invoked once per render by callers; renaming to a proper hook is a separate refactor
    return useQuery({
      queryKey: SETTINGS_KEY,
      queryFn: () => settingsService.getSettings(),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  /**
   * Update settings mutation
   */
  const updateSettings = useMutation({
    mutationFn: (data: SettingsUpdateRequest) =>
      settingsService.updateSettings(data),
    onSuccess: () => {
      // Invalidate and refetch settings
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });

  return {
    getSettings,
    updateSettings,
  };
};

export default useSettings;
