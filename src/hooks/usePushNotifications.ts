import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { FirebaseMessagingService } from "../services/firebase-messaging.service";
import {
  NotificationPayload,
  PushNotificationSettings,
  NotificationPermissionStatus,
} from "../types/notifications";
import {
  useNotificationTokens,
  useNotificationSettings,
} from "./useNotifications";

interface UsePushNotificationsReturn {
  isInitialized: boolean;
  fcmToken: string | null;
  permissionStatus: NotificationPermissionStatus;
  settings: PushNotificationSettings;
  loading: boolean;
  initialize: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  refreshToken: () => Promise<string | null>;
  updateSettings: (newSettings: PushNotificationSettings) => Promise<void>;
  registerHandler: (handler: (payload: NotificationPayload) => void) => void;
  registerActionHandler: (
    handler: (payload: NotificationPayload) => void
  ) => void;
  clearHandlers: () => void;
  clearActionHandlers: () => void;
  error: string | null;
}

const DEFAULT_SETTINGS: PushNotificationSettings = {
  enabled: false,
};

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>({
      granted: false,
      denied: false,
      prompt: true,
    });
  const [settings, setSettings] =
    useState<PushNotificationSettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const messagingService = FirebaseMessagingService.getInstance();
  const { registerToken } = useNotificationTokens();
  const { updateSettings: updateApiSettings } = useNotificationSettings();

  const checkPermissions = useCallback(async (): Promise<void> => {
    try {
      const status = await messagingService.checkPermissions();
      setPermissionStatus(status);
    } catch (error) {
      console.error(
        "[usePushNotifications] Failed to check permissions:",
        error
      );
      setError("Kon notificatie-permissies niet controleren");
    }
  }, [messagingService]);

  const initialize = useCallback(async (): Promise<void> => {
    if (isInitialized) return;

    try {
      setLoading(true);
      setError(null);
      await messagingService.initialize();
      const token = messagingService.getFCMToken();
      setFcmToken(token);
      setIsInitialized(true);

      await checkPermissions();

      if (token && Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform() as "ios" | "android";
        registerToken({ token, platform });
      }
    } catch (error) {
      console.error("[usePushNotifications] Failed to initialize:", error);
      setError("Kon push notificaties niet initialiseren");
    } finally {
      setLoading(false);
    }
  }, [isInitialized, messagingService, checkPermissions, registerToken]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const granted = await messagingService.requestPermissions();
      await checkPermissions();
      return granted;
    } catch (error) {
      console.error(
        "[usePushNotifications] Failed to request permissions:",
        error
      );
      setError("Kon notificatie-permissies niet aanvragen");
      return false;
    } finally {
      setLoading(false);
    }
  }, [messagingService, checkPermissions]);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const token = await messagingService.refreshToken();
      setFcmToken(token);
      return token;
    } catch (error) {
      console.error("[usePushNotifications] Failed to refresh token:", error);
      setError("Kon FCM token niet vernieuwen");
      return null;
    } finally {
      setLoading(false);
    }
  }, [messagingService]);

  const updateSettings = useCallback(
    async (newSettings: PushNotificationSettings): Promise<void> => {
      try {
        setSettings(newSettings);
        localStorage.setItem(
          "pushNotificationSettings",
          JSON.stringify(newSettings)
        );
        updateApiSettings({ enabled: newSettings.enabled });
      } catch (error) {
        console.error(
          "[usePushNotifications] Failed to update settings:",
          error
        );
        setError("Kon notificatie-instellingen niet bijwerken");
      }
    },
    [updateApiSettings]
  );

  const registerHandler = useCallback(
    (handler: (payload: NotificationPayload) => void): void => {
      messagingService.registerMessageHandler(handler);
    },
    [messagingService]
  );

  const registerActionHandler = useCallback(
    (handler: (payload: NotificationPayload) => void): void => {
      messagingService.registerActionHandler(handler);
    },
    [messagingService]
  );

  const clearHandlers = useCallback((): void => {
    messagingService.clearMessageHandlers();
  }, [messagingService]);

  const clearActionHandlers = useCallback((): void => {
    messagingService.clearActionHandlers();
  }, [messagingService]);

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      try {
        const savedSettings = localStorage.getItem("pushNotificationSettings");
        if (savedSettings) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
        }
      } catch (error) {
        console.error("[usePushNotifications] Failed to load settings:", error);
      }
    };

    loadSettings();
  }, []);

  return {
    isInitialized,
    fcmToken,
    permissionStatus,
    settings,
    loading,
    initialize,
    requestPermissions,
    refreshToken,
    updateSettings,
    registerHandler,
    registerActionHandler,
    clearHandlers,
    clearActionHandlers,
    error,
  };
};
