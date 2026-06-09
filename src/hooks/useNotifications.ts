import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import notificationsService from "../api/services/notificationsService";
import { QueryKeys } from "../api/queryKeys";
import {
  FCMTokenRequest,
  NotificationSettingsRequest,
} from "../api/types/notifications";

export const useNotificationTokens = () => {
  const queryClient = useQueryClient();

  const tokensQuery = useQuery({
    queryKey: QueryKeys.notifications.tokens(),
    queryFn: () => notificationsService.getTokens(),
    staleTime: 5 * 60 * 1000,
  });

  const registerTokenMutation = useMutation({
    mutationFn: (tokenData: FCMTokenRequest) =>
      notificationsService.registerToken(tokenData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.notifications.tokens(),
      });
    },
    onError: (error: Error) => {
      console.error("[useNotifications] Failed to register token:", error);
    },
  });

  const removeTokenMutation = useMutation({
    mutationFn: (token: string) => notificationsService.removeToken(token),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.notifications.tokens(),
      });
    },
    onError: (error: Error) => {
      console.error("[useNotifications] Failed to remove token:", error);
    },
  });

  return {
    tokens: tokensQuery.data?.data || [],
    isLoading: tokensQuery.isLoading,
    error: tokensQuery.error,
    registerToken: registerTokenMutation.mutate,
    removeToken: removeTokenMutation.mutate,
    isRegistering: registerTokenMutation.isPending,
    isRemoving: removeTokenMutation.isPending,
  };
};

export const useNotificationSettings = () => {
  const queryClient = useQueryClient();

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: NotificationSettingsRequest) =>
      notificationsService.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.notifications.settings(),
      });
    },
    onError: (error: Error) => {
      console.error("[useNotifications] Failed to update settings:", error);
    },
  });

  return {
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
    error: updateSettingsMutation.error,
  };
};
