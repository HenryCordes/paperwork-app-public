import { useEffect } from "react";
import { usePushNotifications } from "./usePushNotifications";
import { useMarkAsReceived, useMarkAsRead } from "./useNotificationCenter";
import { NotificationPayload } from "../types/notifications";

export const useNotificationReceiver = () => {
  const {
    registerHandler,
    registerActionHandler,
    clearHandlers,
    clearActionHandlers,
  } = usePushNotifications();
  const { mutate: markAsReceived } = useMarkAsReceived();
  const { mutate: markAsRead } = useMarkAsRead();

  useEffect(() => {
    const handleNotificationReceived = (payload: NotificationPayload) => {
      console.log("[useNotificationReceiver] Notification received:", payload);

      if (payload.notificationId) {
        markAsReceived(payload.notificationId);
      }
    };

    const handleNotificationTapped = (payload: NotificationPayload) => {
      console.log("[useNotificationReceiver] Notification tapped:", payload);

      if (payload.notificationId) {
        markAsRead({
          notificationId: payload.notificationId,
          read: true,
        });
      }
    };

    registerHandler(handleNotificationReceived);
    registerActionHandler(handleNotificationTapped);

    return () => {
      clearHandlers();
      clearActionHandlers();
    };
  }, [
    registerHandler,
    registerActionHandler,
    clearHandlers,
    clearActionHandlers,
    markAsReceived,
    markAsRead,
  ]);
};
