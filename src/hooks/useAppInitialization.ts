import { useEffect } from "react";
import { usePushNotifications } from "./usePushNotifications";
import { useAuth } from "./useAuth";
import { useBadge } from "./useBadge";
import { useNotificationReceiver } from "./useNotificationReceiver";

export const useAppInitialization = (): void => {
  const { initialize, isInitialized } = usePushNotifications();
  const auth = useAuth();
  const isAuthenticated = auth.isAuthenticated();

  useBadge();
  useNotificationReceiver();

  useEffect(() => {
    if (!isAuthenticated || isInitialized) {
      return;
    }

    const initializeApp = async (): Promise<void> => {
      try {
        console.log("[AppInitialization] Initializing push notifications...");
        await initialize();

        console.log(
          "[AppInitialization] Push notifications initialized successfully"
        );
      } catch (error) {
        console.error(
          "[AppInitialization] Failed to initialize push notifications:",
          error
        );
      }
    };

    initializeApp();
  }, [initialize, isAuthenticated, isInitialized]);
};
