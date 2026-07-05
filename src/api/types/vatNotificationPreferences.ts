export interface VatNotificationPreferences {
  _id: string;
  userId: string;
  tenantId: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  pushNotifications: boolean;
  advanceWarningDays: number;
  secondReminderEnabled: boolean;
  secondReminderDays: number;
  monthlyNotifications: boolean;
  quarterlyNotifications: boolean;
  yearlyNotifications: boolean;
  pushNotificationToken: string | null;
  pushNotificationPlatform: "ios" | "android" | null;
  lastNotificationSent: string | null;
  notificationsSentCount: number;
  preferredLanguage: "nl" | "en";
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface VatNotificationPreferencesResponse {
  success: boolean;
  data: VatNotificationPreferences;
}

export interface VatNotificationPreferencesUpdateRequest {
  emailNotifications?: boolean;
  inAppNotifications?: boolean;
  pushNotifications?: boolean;
  advanceWarningDays?: number;
  secondReminderEnabled?: boolean;
  secondReminderDays?: number;
  monthlyNotifications?: boolean;
  quarterlyNotifications?: boolean;
  yearlyNotifications?: boolean;
  pushNotificationToken?: string | null;
  pushNotificationPlatform?: "ios" | "android" | null;
  preferredLanguage?: "nl" | "en";
  timezone?: string;
}
