export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  notificationId?: string;
  data?: Record<string, unknown>;
}

export interface PushNotificationSettings {
  enabled: boolean;
}

export interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export interface FCMToken {
  token: string;
  platform: "ios" | "android" | "web";
  createdAt: Date;
  lastUpdated: Date;
}

export interface StoredNotification {
  _id: string;
  title: string;
  body: string;
  type: 'expense' | 'invoice' | 'vat_deadline' | 'general';
  targetId?: string;
  action?: 'view' | 'edit';
  read: boolean;
  received: boolean;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
  data?: Record<string, unknown>;
}

export interface NotificationFilter {
  status?: "all" | "unread" | "read";
  type?: "expense" | "invoice" | "vat_deadline" | "general";
}
