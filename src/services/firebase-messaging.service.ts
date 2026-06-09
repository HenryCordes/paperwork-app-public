import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { NotificationPayload } from "../types/notifications";

export class FirebaseMessagingService {
  private static instance: FirebaseMessagingService;
  private fcmToken: string | null = null;
  private messageHandlers: ((payload: NotificationPayload) => void)[] = [];
  private actionHandlers: ((payload: NotificationPayload) => void)[] = [];
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): FirebaseMessagingService {
    if (!FirebaseMessagingService.instance) {
      FirebaseMessagingService.instance = new FirebaseMessagingService();
    }
    return FirebaseMessagingService.instance;
  }

  public async initialize(): Promise<void> {
    console.log(
      "[FirebaseMessagingService] initialize() called, isInitialized:",
      this.isInitialized
    );

    if (this.isInitialized) {
      console.log("[FirebaseMessagingService] Already initialized, skipping");
      return;
    }

    try {
      const platform = Capacitor.getPlatform();
      const isNative = Capacitor.isNativePlatform();
      console.log(
        "[FirebaseMessagingService] Platform:",
        platform,
        "isNative:",
        isNative
      );

      if (isNative) {
        console.log(
          "[FirebaseMessagingService] Starting native initialization..."
        );
        await this.initializeNative();
        this.isInitialized = true;
        console.log(
          "[FirebaseMessagingService] Native initialization complete"
        );
      } else {
        throw new Error(
          "Push notifications are only supported on mobile devices"
        );
      }
    } catch (error) {
      console.error(
        "[FirebaseMessagingService] Failed to initialize Firebase messaging:",
        error
      );
      throw error;
    }
  }

  private async initializeNative(): Promise<void> {
    console.log("[FirebaseMessagingService] Checking permissions...");
    const permissionStatus = await FirebaseMessaging.checkPermissions();
    console.log(
      "[FirebaseMessagingService] Permission status:",
      permissionStatus
    );

    if (permissionStatus.receive === "prompt") {
      console.log("[FirebaseMessagingService] Requesting permissions...");
      const permission = await FirebaseMessaging.requestPermissions();
      console.log("[FirebaseMessagingService] Permission result:", permission);
      if (permission.receive !== "granted") {
        throw new Error("Push notification permission denied");
      }
    }

    if (permissionStatus.receive === "denied") {
      console.error(
        "[FirebaseMessagingService] Push notification permission was denied"
      );
      throw new Error("Push notification permission denied");
    }

    console.log("[FirebaseMessagingService] Getting FCM token...");
    const result = await FirebaseMessaging.getToken();
    this.fcmToken = result.token;
    console.log("[FirebaseMessagingService] FCM Token received:", result.token);
    this.onTokenReceived(result.token);

    await FirebaseMessaging.addListener("tokenReceived", (event) => {
      console.log("[FirebaseMessagingService] Token refreshed:", event.token);
      this.fcmToken = event.token;
      this.onTokenReceived(event.token);
    });

    await FirebaseMessaging.addListener("notificationReceived", (event) => {
      console.log("[FirebaseMessagingService] Notification received:", event);
      this.handleIncomingMessage(event.notification);
    });

    await FirebaseMessaging.addListener(
      "notificationActionPerformed",
      (event) => {
        console.log(
          "[FirebaseMessagingService] Notification action performed:",
          event
        );
        this.handleNotificationAction(event.notification);
      }
    );

    console.log("[FirebaseMessagingService] All listeners registered");
  }

  public getFCMToken(): string | null {
    return this.fcmToken;
  }

  public async refreshToken(): Promise<string | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseMessaging.getToken();
        this.fcmToken = result.token;
        return result.token;
      } else {
        throw new Error(
          "Push notifications are only supported on mobile devices"
        );
      }
    } catch (error) {
      console.error(
        "[FirebaseMessagingService] Failed to refresh FCM token:",
        error
      );
      return null;
    }
  }

  public registerMessageHandler(
    handler: (payload: NotificationPayload) => void
  ): void {
    this.messageHandlers.push(handler);
  }

  public registerActionHandler(
    handler: (payload: NotificationPayload) => void
  ): void {
    this.actionHandlers.push(handler);
  }

  public clearMessageHandlers(): void {
    this.messageHandlers = [];
  }

  public clearActionHandlers(): void {
    this.actionHandlers = [];
  }

  private onTokenReceived(token: string): void {
    console.log("[FirebaseMessagingService] FCM Token received:", token);
    this.sendTokenToServer(token);
  }

  private async sendTokenToServer(token: string): Promise<void> {
    try {
      const platform = Capacitor.getPlatform() as "ios" | "android" | "web";
      const payload = {
        token,
        platform,
      };

      console.log("[FirebaseMessagingService] Sending token to server:", {
        url: `${
          import.meta.env.VITE_PAPERWORK_API_URL
        }notifications/register-token`,
        platform,
        tokenPrefix: token.substring(0, 20),
      });

      const response = await fetch(
        `${import.meta.env.VITE_PAPERWORK_API_URL}notifications/register-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error(
          "[FirebaseMessagingService] Server rejected token registration:",
          {
            status: response.status,
            error: errorData,
          }
        );
        throw new Error(
          `Failed to register FCM token: ${response.status} - ${JSON.stringify(
            errorData
          )}`
        );
      }

      const responseData = await response.json();
      console.log(
        "[FirebaseMessagingService] Token registered successfully:",
        responseData
      );
    } catch (error) {
      console.error(
        "[FirebaseMessagingService] Failed to send token to server:",
        error
      );
    }
  }

  private async handleIncomingMessage(message: unknown): Promise<void> {
    try {
      const notificationData = this.parseNotificationData(message);

      this.messageHandlers.forEach((handler) => {
        handler(notificationData);
      });

      if (this.messageHandlers.length === 0) {
        this.handleDefaultNotification(notificationData);
      }
    } catch (error) {
      console.error(
        "[FirebaseMessagingService] Failed to handle incoming message:",
        error
      );
    }
  }

  private handleNotificationAction(notification: unknown): void {
    try {
      const notificationData = this.parseNotificationData(notification);

      this.actionHandlers.forEach((handler) => {
        handler(notificationData);
      });

      if (this.actionHandlers.length === 0) {
        this.handleDefaultNotification(notificationData);
      }
    } catch (error) {
      console.error(
        "[FirebaseMessagingService] Failed to handle notification action:",
        error
      );
    }
  }

  private parseNotificationData(message: unknown): NotificationPayload {
    const data = (message as Record<string, unknown>).data || {};

    return {
      id:
        ((data as Record<string, unknown>).id as string) ||
        ((message as Record<string, unknown>).id as string) ||
        Date.now().toString(),
      title:
        ((message as Record<string, unknown>).title as string) ||
        ((
          (message as Record<string, unknown>).notification as Record<
            string,
            unknown
          >
        )?.title as string) ||
        "Paperwork Notificatie",
      body:
        ((message as Record<string, unknown>).body as string) ||
        ((
          (message as Record<string, unknown>).notification as Record<
            string,
            unknown
          >
        )?.body as string) ||
        "",
      notificationId: (data as Record<string, unknown>)
        .notificationId as string,
      data: (data as Record<string, unknown>).customData
        ? JSON.parse((data as Record<string, unknown>).customData as string)
        : data,
    };
  }

  private handleDefaultNotification(payload: NotificationPayload): void {
    console.log("[FirebaseMessagingService] Received notification:", payload);
  }

  public async checkPermissions(): Promise<{
    granted: boolean;
    denied: boolean;
    prompt: boolean;
  }> {
    if (Capacitor.isNativePlatform()) {
      const status = await FirebaseMessaging.checkPermissions();
      return {
        granted: status.receive === "granted",
        denied: status.receive === "denied",
        prompt: status.receive === "prompt",
      };
    } else {
      throw new Error(
        "Push notifications are only supported on mobile devices"
      );
    }
  }

  public async requestPermissions(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      const permission = await FirebaseMessaging.requestPermissions();
      return permission.receive === "granted";
    } else {
      throw new Error(
        "Push notifications are only supported on mobile devices"
      );
    }
  }
}
