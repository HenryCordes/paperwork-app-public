# Notification Center & Badge Management Implementation Plan

## Overview

Implement a full-featured Notification Center with badge control, read/unread states, filtering, and deep linking navigation.

---

## Step 1: Backend API Changes (Do First)

### 1.1 Add Notification Storage Endpoints

**GET /api/notifications**

- Returns list of all notifications for the user
- Query params: `status` (all/unread/read), `type` (expense/invoice/vat_deadline/general)
- Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "notification_id",
      "title": "New expense added",
      "body": "Expense #123 was created",
      "type": "expense",
      "targetId": "expense_123",
      "action": "view",
      "read": false,
      "createdAt": "2025-01-11T10:00:00Z",
      "data": {}
    }
  ]
}
```

**PUT /api/notifications/:id/read**

- Mark a notification as read
- Request body: `{ "read": true }`
- Response: Updated notification object

**PUT /api/notifications/mark-all-read**

- Mark all notifications as read for the current user
- Response: `{ "success": true, "count": 5 }`

**DELETE /api/notifications/:id**

- Delete a notification
- Response: `{ "success": true }`

**GET /api/notifications/unread-count**

- Returns count of unread notifications
- Response: `{ "success": true, "count": 3 }`

### 1.2 Update Notification Payload Structure

When sending push notifications from backend, include:

```json
{
  "notification": {
    "title": "New expense added",
    "body": "Expense #123 was created"
  },
  "data": {
    "type": "expense",
    "targetId": "expense_123",
    "action": "view",
    "notificationId": "unique_notification_id"
  },
  "apns": {
    "payload": {
      "aps": {
        "badge": 1
      }
    }
  }
}
```

**Notification Types:**

- `expense` - Expense related notifications
- `invoice` - Invoice related notifications
- `vat_deadline` - VAT deadline reminders
- `general` - General app notifications

**Actions:**

- `view` - View the item
- `edit` - Edit the item

---

## Step 2: Frontend Type Updates

### 2.1 Update `src/types/notifications.ts`

Add new interfaces:

```typescript
export interface StoredNotification {
  id: string;
  title: string;
  body: string;
  type: "expense" | "invoice" | "vat_deadline" | "general";
  targetId?: string;
  action?: "view" | "edit";
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface NotificationFilter {
  status: "all" | "unread" | "read";
  type?: "expense" | "invoice" | "vat_deadline" | "general";
}

export interface NotificationListResponse {
  success: boolean;
  data: StoredNotification[];
}

export interface UnreadCountResponse {
  success: boolean;
  count: number;
}

export interface MarkAsReadResponse {
  success: boolean;
  data: StoredNotification;
}

export interface MarkAllReadResponse {
  success: boolean;
  count: number;
}
```

### 2.2 Update `src/api/types/notifications.ts`

Add the same interfaces for API types.

---

## Step 3: Frontend Service & Hooks

### 3.1 Update `src/api/services/notificationsService.ts`

Add new methods:

```typescript
/**
 * Get all notifications with optional filters
 */
async getNotifications(filter?: NotificationFilter): Promise<NotificationListResponse>

/**
 * Mark a notification as read
 */
async markAsRead(notificationId: string): Promise<MarkAsReadResponse>

/**
 * Mark all notifications as read
 */
async markAllAsRead(): Promise<MarkAllReadResponse>

/**
 * Delete a notification
 */
async deleteNotification(notificationId: string): Promise<{ success: boolean }>

/**
 * Get count of unread notifications
 */
async getUnreadCount(): Promise<UnreadCountResponse>
```

### 3.2 Create `src/hooks/useNotificationCenter.ts`

Implement:

- `useNotifications(filter?: NotificationFilter)` - Query for fetching notifications
- `useMarkAsRead()` - Mutation for marking notification as read
- `useMarkAllAsRead()` - Mutation for marking all as read
- `useDeleteNotification()` - Mutation for deleting notification
- `useUnreadCount()` - Query for unread count
- Auto-invalidate queries when mutations succeed

### 3.3 Update `src/api/queryKeys.ts`

Add:

```typescript
notifications: {
  all: () => ['notifications'] as const,
  lists: () => [...queryKeys.notifications.all(), 'list'] as const,
  list: (filter?: NotificationFilter) => [...queryKeys.notifications.lists(), filter] as const,
  unreadCount: () => [...queryKeys.notifications.all(), 'unread-count'] as const,
}
```

---

## Step 4: Badge Management

### 4.1 Install Capacitor Badge Plugin

```bash
npm install @capawesome/capacitor-badge
npx cap sync ios
npx cap sync android
```

### 4.2 Create `src/services/badge.service.ts`

```typescript
import { Badge } from "@capawesome/capacitor-badge";
import { Capacitor } from "@capacitor/core";

export class BadgeService {
  private static instance: BadgeService;

  public static getInstance(): BadgeService {
    if (!BadgeService.instance) {
      BadgeService.instance = new BadgeService();
    }
    return BadgeService.instance;
  }

  async setBadgeCount(count: number): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Badge.set({ count });
    }
  }

  async clearBadge(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Badge.clear();
    }
  }

  async getBadgeCount(): Promise<number> {
    if (Capacitor.isNativePlatform()) {
      const result = await Badge.get();
      return result.count;
    }
    return 0;
  }

  async incrementBadge(): Promise<void> {
    const current = await this.getBadgeCount();
    await this.setBadgeCount(current + 1);
  }

  async decrementBadge(): Promise<void> {
    const current = await this.getBadgeCount();
    await this.setBadgeCount(Math.max(0, current - 1));
  }

  async checkPermissions(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      const result = await Badge.checkPermissions();
      return result.display === "granted";
    }
    return false;
  }

  async requestPermissions(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      const result = await Badge.requestPermissions();
      return result.display === "granted";
    }
    return false;
  }
}
```

### 4.3 Create `src/hooks/useBadge.ts`

```typescript
import { useCallback, useEffect } from "react";
import { BadgeService } from "../services/badge.service";
import { useUnreadCount } from "./useNotificationCenter";

export const useBadge = () => {
  const badgeService = BadgeService.getInstance();
  const { data: unreadCount } = useUnreadCount();

  // Sync badge with unread count
  useEffect(() => {
    if (unreadCount !== undefined) {
      badgeService.setBadgeCount(unreadCount.count);
    }
  }, [unreadCount, badgeService]);

  const setBadge = useCallback(
    async (count: number) => {
      await badgeService.setBadgeCount(count);
    },
    [badgeService]
  );

  const clearBadge = useCallback(async () => {
    await badgeService.clearBadge();
  }, [badgeService]);

  const incrementBadge = useCallback(async () => {
    await badgeService.incrementBadge();
  }, [badgeService]);

  const decrementBadge = useCallback(async () => {
    await badgeService.decrementBadge();
  }, [badgeService]);

  return {
    setBadge,
    clearBadge,
    incrementBadge,
    decrementBadge,
  };
};
```

---

## Step 5: Notification Center UI

### 5.1 Create `src/pages/Notifications/List/index.tsx`

Features:

- Header with title "Notificaties"
- Segment buttons for filtering: All / Unread / Read
- List of notifications using IonList
- Each notification shows:
  - Title (bold if unread)
  - Body text
  - Timestamp (relative, e.g., "2 hours ago")
  - Unread indicator (dot or badge)
  - Icon based on type
- Swipe actions:
  - Mark as read/unread
  - Delete
- Pull to refresh
- Empty state when no notifications
- Tap notification → navigate to target page & mark as read
- "Mark all as read" button in toolbar

### 5.2 Create `src/pages/Notifications/List/Notifications.css`

Styling for:

- Unread indicator (dot, bold text)
- Notification item layout
- Swipe action buttons
- Empty state
- Filter segment

### 5.3 Add route in `src/App.tsx`

```typescript
<Route exact path="/notifications" component={NotificationsList} />
```

### 5.4 Add navigation item

Option 1: Add to tab bar (if space available)
Option 2: Add to settings menu
Option 3: Add bell icon in header with badge

---

## Step 6: Deep Linking & Navigation

### 6.1 Create `src/services/notification-navigation.service.ts`

```typescript
import { StoredNotification } from "../types/notifications";

export class NotificationNavigationService {
  public static navigateFromNotification(
    notification: StoredNotification,
    history: any
  ): void {
    switch (notification.type) {
      case "expense":
        if (notification.action === "edit") {
          history.push(`/expenses/edit/${notification.targetId}`);
        } else {
          history.push(`/expenses/${notification.targetId}`);
        }
        break;

      case "invoice":
        if (notification.action === "edit") {
          history.push(`/invoices/edit/${notification.targetId}`);
        } else {
          history.push(`/invoices/${notification.targetId}`);
        }
        break;

      case "vat_deadline":
        history.push("/taxes");
        break;

      case "general":
      default:
        history.push("/dashboard");
        break;
    }
  }
}
```

### 6.2 Update `src/services/firebase-messaging.service.ts`

Update `handleNotificationAction` method:

1. Parse notification data
2. Save notification to backend (if not already saved)
3. Navigate to appropriate page using NotificationNavigationService
4. Mark notification as read via API
5. Update badge count

Update `handleIncomingMessage` method:

1. Save notification to backend
2. Increment badge count
3. Invalidate notification queries
4. Show in-app toast (optional)

---

## Step 7: Integration

### 7.1 Update `src/hooks/useAppInitialization.ts`

Add notification initialization:

```typescript
// Initialize badge service
const badgeService = BadgeService.getInstance();
await badgeService.checkPermissions();

// Fetch initial unread count and set badge
const unreadCount = await notificationsService.getUnreadCount();
await badgeService.setBadgeCount(unreadCount.count);

// Register notification handler
pushNotifications.registerHandler(async (payload) => {
  // Save notification to backend
  // Increment badge
  // Invalidate queries
  // Show toast (optional)
});
```

### 7.2 Update `src/App.tsx`

Add notification action handler:

```typescript
useEffect(() => {
  const handleNotificationAction = async (notification: any) => {
    // Parse notification
    // Navigate to target
    // Mark as read
    // Decrement badge
  };

  // Register listener for notification taps
  FirebaseMessaging.addListener(
    "notificationActionPerformed",
    handleNotificationAction
  );

  return () => {
    // Cleanup listener
  };
}, []);
```

---

## Implementation Order

1. **Backend API** (Do first)

   - Add notification storage endpoints
   - Update notification payload structure

2. **Frontend Types**

   - Update notification types
   - Add new interfaces

3. **Frontend Services**

   - Update notificationsService
   - Create BadgeService
   - Create NotificationNavigationService

4. **Frontend Hooks**

   - Create useNotificationCenter
   - Create useBadge
   - Update useAppInitialization

5. **UI Components**

   - Create Notifications List page
   - Add routing
   - Add navigation item

6. **Integration**
   - Update firebase-messaging.service
   - Update App.tsx
   - Test end-to-end flow

---

## Testing Checklist

- [ ] Notification received → badge increments
- [ ] Notification tapped → navigates to correct page
- [ ] Notification tapped → marked as read
- [ ] Notification marked as read → badge decrements
- [ ] Notification Center shows all notifications
- [ ] Filter by unread/read works
- [ ] Swipe to delete works
- [ ] Swipe to mark as read/unread works
- [ ] Mark all as read works
- [ ] Badge syncs on app launch
- [ ] Badge syncs when notifications change
- [ ] Deep linking works for all notification types
- [ ] Empty state shows when no notifications
- [ ] Pull to refresh works

---

## Notes

- **Badge Control**: iOS automatically shows badge from push notification payload, but we need programmatic control for when user marks as read in-app
- **Persistence**: Backend stores all notifications, frontend queries them
- **Real-time Updates**: Use React Query's `invalidateQueries` when notifications change
- **Deep Linking**: Map notification types to routes
- **State Management**: React Query for server state, local state for UI filters
- **Permissions**: Badge permissions are separate from notification permissions on iOS
