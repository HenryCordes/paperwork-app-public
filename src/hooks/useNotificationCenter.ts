import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import notificationsService from "../api/services/notificationsService";
import { QueryKeys } from "../api/queryKeys";
import { NotificationFilter } from "../types/notifications";

export const useNotifications = (filter?: NotificationFilter) => {
  return useQuery({
    queryKey: QueryKeys.notifications.list(filter),
    queryFn: () => notificationsService.getNotifications(filter),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: QueryKeys.notifications.unreadCount(),
    queryFn: () => notificationsService.getUnreadCount(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      notificationId,
      read,
    }: {
      notificationId: string;
      read?: boolean;
    }) => notificationsService.markAsRead(notificationId, read),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.notifications.base,
      });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.notifications.base,
      });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationsService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.notifications.base,
      });
    },
  });
};

export const useMarkAsReceived = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationsService.markAsReceived(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.notifications.base,
      });
    },
  });
};
