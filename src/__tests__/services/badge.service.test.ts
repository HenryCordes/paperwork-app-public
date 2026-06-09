import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BadgeService } from "../../services/badge.service";

// ---------------------------------------------------------------------------
// Module mocks — declared before any imports that resolve the modules.
// ---------------------------------------------------------------------------

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

vi.mock("@capawesome/capacitor-badge", () => ({
  Badge: {
    set: vi.fn(),
    clear: vi.fn(),
    get: vi.fn(),
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports AFTER mocks so Vitest replaces the modules in the service too.
// ---------------------------------------------------------------------------

import { Capacitor } from "@capacitor/core";
import { Badge } from "@capawesome/capacitor-badge";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nativePlatform = (native: boolean) =>
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(native);

// The singleton persists across tests; reset it so getInstance() creates fresh.
const resetSingleton = () => {
  // @ts-expect-error — accessing private static for test isolation
  BadgeService.instance = undefined;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BadgeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSingleton();
  });

  afterEach(() => {
    resetSingleton();
  });

  // -------------------------------------------------------------------------
  // Singleton
  // -------------------------------------------------------------------------

  describe("getInstance", () => {
    it("returns the same instance on repeated calls", () => {
      const a = BadgeService.getInstance();
      const b = BadgeService.getInstance();
      expect(a).toBe(b);
    });
  });

  // -------------------------------------------------------------------------
  // setBadgeCount
  // -------------------------------------------------------------------------

  describe("setBadgeCount", () => {
    it("calls Badge.set with the given count on native", async () => {
      nativePlatform(true);
      vi.mocked(Badge.set).mockResolvedValue(undefined as never);

      await BadgeService.getInstance().setBadgeCount(5);

      expect(Badge.set).toHaveBeenCalledOnce();
      expect(Badge.set).toHaveBeenCalledWith({ count: 5 });
    });

    it("does NOT call Badge.set on web", async () => {
      nativePlatform(false);

      await BadgeService.getInstance().setBadgeCount(5);

      expect(Badge.set).not.toHaveBeenCalled();
    });

    it("handles Badge.set throwing without propagating the error", async () => {
      nativePlatform(true);
      vi.mocked(Badge.set).mockRejectedValue(new Error("plugin error") as never);
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      await expect(BadgeService.getInstance().setBadgeCount(3)).resolves.toBeUndefined();

      consoleSpy.mockRestore();
    });

    it.each([
      { count: 0, label: "zero" },
      { count: -1, label: "negative" },
      { count: 999, label: "large positive" },
    ])("passes $label count ($count) straight to Badge.set", async ({ count }) => {
      nativePlatform(true);
      vi.mocked(Badge.set).mockResolvedValue(undefined as never);

      await BadgeService.getInstance().setBadgeCount(count);

      expect(Badge.set).toHaveBeenCalledWith({ count });
    });
  });

  // -------------------------------------------------------------------------
  // clearBadge
  // -------------------------------------------------------------------------

  describe("clearBadge", () => {
    it("calls Badge.clear on native", async () => {
      nativePlatform(true);
      vi.mocked(Badge.clear).mockResolvedValue(undefined as never);

      await BadgeService.getInstance().clearBadge();

      expect(Badge.clear).toHaveBeenCalledOnce();
    });

    it("does NOT call Badge.clear on web", async () => {
      nativePlatform(false);

      await BadgeService.getInstance().clearBadge();

      expect(Badge.clear).not.toHaveBeenCalled();
    });

    it("handles Badge.clear throwing without propagating the error", async () => {
      nativePlatform(true);
      vi.mocked(Badge.clear).mockRejectedValue(new Error("clear error") as never);
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      await expect(BadgeService.getInstance().clearBadge()).resolves.toBeUndefined();

      consoleSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // getBadgeCount
  // -------------------------------------------------------------------------

  describe("getBadgeCount", () => {
    it("returns the count from Badge.get on native", async () => {
      nativePlatform(true);
      vi.mocked(Badge.get).mockResolvedValue({ count: 7 } as never);

      const result = await BadgeService.getInstance().getBadgeCount();

      expect(Badge.get).toHaveBeenCalledOnce();
      expect(result).toBe(7);
    });

    it("returns 0 on web without calling Badge.get", async () => {
      nativePlatform(false);

      const result = await BadgeService.getInstance().getBadgeCount();

      expect(Badge.get).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it("returns 0 when Badge.get throws on native", async () => {
      nativePlatform(true);
      vi.mocked(Badge.get).mockRejectedValue(new Error("get error") as never);
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      const result = await BadgeService.getInstance().getBadgeCount();

      expect(result).toBe(0);
      consoleSpy.mockRestore();
    });

    it("returns 0 when Badge.get resolves with count 0", async () => {
      nativePlatform(true);
      vi.mocked(Badge.get).mockResolvedValue({ count: 0 } as never);

      const result = await BadgeService.getInstance().getBadgeCount();

      expect(result).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // incrementBadge
  // -------------------------------------------------------------------------

  describe("incrementBadge", () => {
    it("increments the current badge count by 1 on native", async () => {
      nativePlatform(true);
      vi.mocked(Badge.get).mockResolvedValue({ count: 4 } as never);
      vi.mocked(Badge.set).mockResolvedValue(undefined as never);

      await BadgeService.getInstance().incrementBadge();

      expect(Badge.set).toHaveBeenCalledWith({ count: 5 });
    });

    it("increments from 0 to 1 on native", async () => {
      nativePlatform(true);
      vi.mocked(Badge.get).mockResolvedValue({ count: 0 } as never);
      vi.mocked(Badge.set).mockResolvedValue(undefined as never);

      await BadgeService.getInstance().incrementBadge();

      expect(Badge.set).toHaveBeenCalledWith({ count: 1 });
    });

    it("does not call Badge.set on web (getBadgeCount returns 0, setBadgeCount is no-op)", async () => {
      nativePlatform(false);

      await BadgeService.getInstance().incrementBadge();

      expect(Badge.get).not.toHaveBeenCalled();
      expect(Badge.set).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // decrementBadge
  // -------------------------------------------------------------------------

  describe("decrementBadge", () => {
    it("decrements the current badge count by 1 on native", async () => {
      nativePlatform(true);
      vi.mocked(Badge.get).mockResolvedValue({ count: 3 } as never);
      vi.mocked(Badge.set).mockResolvedValue(undefined as never);

      await BadgeService.getInstance().decrementBadge();

      expect(Badge.set).toHaveBeenCalledWith({ count: 2 });
    });

    it("clamps to 0 when current count is already 0", async () => {
      nativePlatform(true);
      vi.mocked(Badge.get).mockResolvedValue({ count: 0 } as never);
      vi.mocked(Badge.set).mockResolvedValue(undefined as never);

      await BadgeService.getInstance().decrementBadge();

      expect(Badge.set).toHaveBeenCalledWith({ count: 0 });
    });

    it("clamps to 0 when current count is 1", async () => {
      nativePlatform(true);
      vi.mocked(Badge.get).mockResolvedValue({ count: 1 } as never);
      vi.mocked(Badge.set).mockResolvedValue(undefined as never);

      await BadgeService.getInstance().decrementBadge();

      expect(Badge.set).toHaveBeenCalledWith({ count: 0 });
    });

    it("does not call Badge.set on web", async () => {
      nativePlatform(false);

      await BadgeService.getInstance().decrementBadge();

      expect(Badge.get).not.toHaveBeenCalled();
      expect(Badge.set).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // checkPermissions
  // -------------------------------------------------------------------------

  describe("checkPermissions", () => {
    it("returns true when permission display is 'granted' on native", async () => {
      nativePlatform(true);
      vi.mocked(Badge.checkPermissions).mockResolvedValue({ display: "granted" } as never);

      const result = await BadgeService.getInstance().checkPermissions();

      expect(Badge.checkPermissions).toHaveBeenCalledOnce();
      expect(result).toBe(true);
    });

    it("returns false when permission display is not 'granted' on native", async () => {
      nativePlatform(true);
      vi.mocked(Badge.checkPermissions).mockResolvedValue({ display: "denied" } as never);

      const result = await BadgeService.getInstance().checkPermissions();

      expect(result).toBe(false);
    });

    it("returns false on web without calling Badge.checkPermissions", async () => {
      nativePlatform(false);

      const result = await BadgeService.getInstance().checkPermissions();

      expect(Badge.checkPermissions).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("returns false when Badge.checkPermissions throws", async () => {
      nativePlatform(true);
      vi.mocked(Badge.checkPermissions).mockRejectedValue(new Error("perm error") as never);
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      const result = await BadgeService.getInstance().checkPermissions();

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    it.each([
      { display: "prompt", expected: false },
      { display: "prompt-with-rationale", expected: false },
      { display: "", expected: false },
    ])("returns false for display='$display'", async ({ display, expected }) => {
      nativePlatform(true);
      vi.mocked(Badge.checkPermissions).mockResolvedValue({ display } as never);

      const result = await BadgeService.getInstance().checkPermissions();

      expect(result).toBe(expected);
    });
  });

  // -------------------------------------------------------------------------
  // requestPermissions
  // -------------------------------------------------------------------------

  describe("requestPermissions", () => {
    it("returns true when permission display is 'granted' on native", async () => {
      nativePlatform(true);
      vi.mocked(Badge.requestPermissions).mockResolvedValue({ display: "granted" } as never);

      const result = await BadgeService.getInstance().requestPermissions();

      expect(Badge.requestPermissions).toHaveBeenCalledOnce();
      expect(result).toBe(true);
    });

    it("returns false when permission display is not 'granted' on native", async () => {
      nativePlatform(true);
      vi.mocked(Badge.requestPermissions).mockResolvedValue({ display: "denied" } as never);

      const result = await BadgeService.getInstance().requestPermissions();

      expect(result).toBe(false);
    });

    it("returns false on web without calling Badge.requestPermissions", async () => {
      nativePlatform(false);

      const result = await BadgeService.getInstance().requestPermissions();

      expect(Badge.requestPermissions).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("returns false when Badge.requestPermissions throws", async () => {
      nativePlatform(true);
      vi.mocked(Badge.requestPermissions).mockRejectedValue(new Error("req error") as never);
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      const result = await BadgeService.getInstance().requestPermissions();

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });
});
