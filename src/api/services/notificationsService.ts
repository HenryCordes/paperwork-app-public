import { AxiosInstance } from "axios";
import axiosInstance from "../axiosInstance";
import {
  FCMTokenRequest,
  NotificationSettingsRequest,
  NotificationSettingsResponse,
  FCMTokenResponse,
  GetTokensResponse,
  NotificationListResponse,
  UnreadCountResponse,
  MarkAsReadResponse,
  MarkAllReadResponse,
  DeleteNotificationResponse,
} from "../types/notifications";
import { NotificationFilter } from "../../types/notifications";

/**
 * Service for managing push notification-related API calls
 */
class NotificationsService {
  private axios: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axios = axiosInstance;
  }

  /**
   * Register FCM token for push notifications
   */
  async registerToken(tokenData: FCMTokenRequest): Promise<FCMTokenResponse> {
    const response = await this.axios.post<FCMTokenResponse>(
      "notifications/register-token",
      tokenData
    );
    return response.data;
  }

  /**
   * Remove FCM token
   */
  async removeToken(token: string): Promise<FCMTokenResponse> {
    const response = await this.axios.delete<FCMTokenResponse>(
      "notifications/remove-token",
      { data: { token } }
    );
    return response.data;
  }

  /**
   * Update push notification settings
   */
  async updateSettings(
    settings: NotificationSettingsRequest
  ): Promise<NotificationSettingsResponse> {
    const response = await this.axios.put<NotificationSettingsResponse>(
      "notifications/settings",
      settings
    );
    return response.data;
  }

  /**
   * Get user's FCM tokens
   */
  async getTokens(): Promise<GetTokensResponse> {
    const response = await this.axios.get<GetTokensResponse>(
      "notifications/tokens"
    );
    return response.data;
  }

  /**
   * Get all notifications with optional filters
   */
  async getNotifications(
    filter?: NotificationFilter
  ): Promise<NotificationListResponse> {
    const params: Record<string, string> = {};

    if (filter?.status) {
      params.status = filter.status;
    }

    if (filter?.type) {
      params.type = filter.type;
    }

    const response = await this.axios.get<NotificationListResponse>(
      "notifications",
      { params }
    );
    return response.data;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(
    notificationId: string,
    read: boolean = true
  ): Promise<MarkAsReadResponse> {
    const response = await this.axios.put<MarkAsReadResponse>(
      `notifications/${notificationId}/read`,
      { read }
    );
    return response.data;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<MarkAllReadResponse> {
    const response = await this.axios.put<MarkAllReadResponse>(
      "notifications/mark-all-read"
    );
    return response.data;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(
    notificationId: string
  ): Promise<DeleteNotificationResponse> {
    const response = await this.axios.delete<DeleteNotificationResponse>(
      `notifications/${notificationId}`
    );
    return response.data;
  }

  /**
   * Get count of unread notifications
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await this.axios.get<UnreadCountResponse>(
      "notifications/unread-count"
    );
    return response.data;
  }

  /**
   * Mark a notification as received
   */
  async markAsReceived(notificationId: string): Promise<MarkAsReadResponse> {
    const response = await this.axios.put<MarkAsReadResponse>(
      `notifications/${notificationId}/received`
    );
    return response.data;
  }
}

// Create and export a default instance of NotificationsService
const notificationsService = new NotificationsService(axiosInstance);

export default notificationsService;
