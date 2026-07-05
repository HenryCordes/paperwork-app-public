import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import vatNotificationPreferencesService from "../api/services/vatNotificationPreferencesService";
import {
  VatNotificationPreferencesResponse,
  VatNotificationPreferencesUpdateRequest,
} from "../api/types/vatNotificationPreferences";

const VAT_NOTIFICATION_PREFERENCES_KEY = ["vatNotificationPreferences"];

export const useVatNotificationPreferences = (): UseQueryResult<
  VatNotificationPreferencesResponse,
  Error
> => {
  return useQuery({
    queryKey: VAT_NOTIFICATION_PREFERENCES_KEY,
    queryFn: () => vatNotificationPreferencesService.getPreferences(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useUpdateVatNotificationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VatNotificationPreferencesUpdateRequest) =>
      vatNotificationPreferencesService.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: VAT_NOTIFICATION_PREFERENCES_KEY,
      });
    },
  });
};
