import { useCallback, useEffect } from "react";
import { BadgeService } from "../services/badge.service";
import { useUnreadCount } from "./useNotificationCenter";

export const useBadge = () => {
  const badgeService = BadgeService.getInstance();
  const { data: unreadCount } = useUnreadCount();

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
