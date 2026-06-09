export interface FCMTokenRequest {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

export interface NotificationSettingsRequest {
  enabled: boolean;
}

export interface NotificationSettingsResponse {
  success: boolean;
  message: string;
}

export interface FCMTokenResponse {
  success: boolean;
  message: string;
}

export interface TestNotificationResponse {
  success: boolean;
  message: string;
  notificationId?: string;
  sent?: boolean;
  results: Array<{
    platform: string;
    success: boolean;
    error?: string;
  }>;
}

export interface FCMTokenInfo {
  platform: string;
  createdAt: string;
  lastUsed: string;
}

export interface GetTokensResponse {
  success: boolean;
  data: FCMTokenInfo[];
}

export interface NotificationListResponse {
  success: boolean;
  data: Array<{
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
  }>;
}

export interface UnreadCountResponse {
  success: boolean;
  count: number;
}

export interface MarkAsReadResponse {
  success: boolean;
  data: {
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
  };
}

export interface MarkAllReadResponse {
  success: boolean;
  count: number;
}

export interface DeleteNotificationResponse {
  success: boolean;
}
