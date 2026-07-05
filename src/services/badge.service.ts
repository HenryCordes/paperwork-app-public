import { Badge } from "@capawesome/capacitor-badge";
import { Capacitor } from "@capacitor/core";

export class BadgeService {
  private static instance: BadgeService;

  private constructor() {}

  public static getInstance(): BadgeService {
    if (!BadgeService.instance) {
      BadgeService.instance = new BadgeService();
    }
    return BadgeService.instance;
  }

  async setBadgeCount(count: number): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await Badge.set({ count });
      } catch (error) {
        console.error("[BadgeService] Failed to set badge count:", error);
      }
    }
  }

  async clearBadge(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await Badge.clear();
      } catch (error) {
        console.error("[BadgeService] Failed to clear badge:", error);
      }
    }
  }

  async getBadgeCount(): Promise<number> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Badge.get();
        return result.count;
      } catch (error) {
        console.error("[BadgeService] Failed to get badge count:", error);
        return 0;
      }
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
      try {
        const result = await Badge.checkPermissions();
        return result.display === "granted";
      } catch (error) {
        console.error("[BadgeService] Failed to check permissions:", error);
        return false;
      }
    }
    return false;
  }

  async requestPermissions(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Badge.requestPermissions();
        return result.display === "granted";
      } catch (error) {
        console.error("[BadgeService] Failed to request permissions:", error);
        return false;
      }
    }
    return false;
  }
}
