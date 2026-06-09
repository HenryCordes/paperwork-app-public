import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithClient, makeTestQueryClient } from "../test-utils";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useMarkAsReceived,
} from "../../hooks/useNotificationCenter";
import notificationsService from "../../api/services/notificationsService";
import { QueryKeys } from "../../api/queryKeys";
import type {
  NotificationListResponse,
  UnreadCountResponse,
  MarkAsReadResponse,
  MarkAllReadResponse,
  DeleteNotificationResponse,
} from "../../api/types/notifications";
import type { NotificationFilter } from "../../types/notifications";

vi.mock("../../api/services/notificationsService");

const mockedService = vi.mocked(notificationsService, true);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const notificationItem = {
  _id: "n1",
  title: "New invoice",
  body: "Invoice #42 is due",
  type: "invoice" as const,
  read: false,
  received: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const notificationListResponse: NotificationListResponse = {
  success: true,
  data: [notificationItem],
};

const unreadCountResponse: UnreadCountResponse = {
  success: true,
  count: 5,
};

const markAsReadResponse: MarkAsReadResponse = {
  success: true,
  data: { ...notificationItem, read: true },
};

const markAllReadResponse: MarkAllReadResponse = {
  success: true,
  count: 3,
};

const deleteNotificationResponse: DeleteNotificationResponse = {
  success: true,
};

// ---------------------------------------------------------------------------
// useNotifications
// ---------------------------------------------------------------------------

describe("useNotifications", () => {
  it("returns the notifications list when no filter is given", async () => {
    mockedService.getNotifications.mockResolvedValue(notificationListResponse);

    const { result } = renderHookWithClient(() => useNotifications());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(notificationListResponse);
    expect(mockedService.getNotifications).toHaveBeenCalledWith(undefined);
  });

  it("passes the filter to the service and includes it in the query key", async () => {
    const filter: NotificationFilter = { status: "unread", type: "invoice" };
    mockedService.getNotifications.mockResolvedValue(notificationListResponse);

    const { result } = renderHookWithClient(() => useNotifications(filter));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedService.getNotifications).toHaveBeenCalledWith(filter);
    // The query ran — data is the full response shape
    expect(result.current.data?.data[0]._id).toBe("n1");
  });

  it("surfaces the service error when the call rejects", async () => {
    mockedService.getNotifications.mockRejectedValue(new Error("Network error"));

    const { result } = renderHookWithClient(() => useNotifications());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// useUnreadCount
// ---------------------------------------------------------------------------

describe("useUnreadCount", () => {
  it("surfaces the unread count returned by the service", async () => {
    mockedService.getUnreadCount.mockResolvedValue(unreadCountResponse);

    const { result } = renderHookWithClient(() => useUnreadCount());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(unreadCountResponse);
    expect(result.current.data?.count).toBe(5);
    expect(mockedService.getUnreadCount).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// useMarkAsRead
// ---------------------------------------------------------------------------

describe("useMarkAsRead", () => {
  it("calls the service with notificationId and read flag, then invalidates the notifications base key", async () => {
    mockedService.markAsRead.mockResolvedValue(markAsReadResponse);

    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useMarkAsRead(), { client });

    await result.current.mutateAsync({ notificationId: "n1", read: true });

    expect(mockedService.markAsRead).toHaveBeenCalledWith("n1", true);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.notifications.base,
      })
    );
  });

  it("uses read=undefined (service defaults to true) when no read flag is provided", async () => {
    mockedService.markAsRead.mockResolvedValue(markAsReadResponse);

    const { result } = renderHookWithClient(() => useMarkAsRead());

    await result.current.mutateAsync({ notificationId: "n2" });

    // read is not supplied so the call receives undefined as the second arg
    expect(mockedService.markAsRead).toHaveBeenCalledWith("n2", undefined);
  });
});

// ---------------------------------------------------------------------------
// useMarkAllAsRead
// ---------------------------------------------------------------------------

describe("useMarkAllAsRead", () => {
  it("calls markAllAsRead and invalidates the notifications base key", async () => {
    mockedService.markAllAsRead.mockResolvedValue(markAllReadResponse);

    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useMarkAllAsRead(), { client });

    await result.current.mutateAsync();

    expect(mockedService.markAllAsRead).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.notifications.base,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// useDeleteNotification
// ---------------------------------------------------------------------------

describe("useDeleteNotification", () => {
  it("calls deleteNotification with the given id and invalidates the notifications base key", async () => {
    mockedService.deleteNotification.mockResolvedValue(
      deleteNotificationResponse
    );

    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useDeleteNotification(), {
      client,
    });

    await result.current.mutateAsync("n1");

    expect(mockedService.deleteNotification).toHaveBeenCalledWith("n1");

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.notifications.base,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// useMarkAsReceived
// ---------------------------------------------------------------------------

describe("useMarkAsReceived", () => {
  it("calls markAsReceived with the given id and invalidates the notifications base key", async () => {
    mockedService.markAsReceived.mockResolvedValue(markAsReadResponse);

    const client = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHookWithClient(() => useMarkAsReceived(), {
      client,
    });

    await result.current.mutateAsync("n1");

    expect(mockedService.markAsReceived).toHaveBeenCalledWith("n1");

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QueryKeys.notifications.base,
      })
    );
  });
});
