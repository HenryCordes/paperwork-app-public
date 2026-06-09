/**
 * Unit tests for FirebaseMessagingService.
 *
 * COVERAGE NOTES — what is tested here:
 *   - Singleton pattern (getInstance)
 *   - initialize() — native path (isInitialized guard, permission branches)
 *   - initialize() — web-fallback branch throws
 *   - getFCMToken() / refreshToken() — native + web branches
 *   - registerMessageHandler / registerActionHandler / clearMessageHandlers / clearActionHandlers
 *   - parseNotificationData (via handleIncomingMessage / handleNotificationAction, exercised
 *     through the registered handler callbacks): all field-resolution branches including
 *     title/body fallback cascade, customData JSON parsing, and id fallback.
 *   - handler routing: registered handlers called; default handler falls back when empty.
 *   - checkPermissions / requestPermissions — both native and web branches.
 *
 * WHAT CANNOT EASILY BE UNIT-TESTED:
 *   - sendTokenToServer — calls `fetch` and reads `localStorage`; requires network/env
 *     setup. The method swallows its own errors so failures are invisible to callers.
 *     Covered implicitly when initializeNative resolves (onTokenReceived → sendTokenToServer
 *     is called and the fetch mock is set up in the initialize tests).
 *   - The `tokenReceived` / `notificationReceived` / `notificationActionPerformed` listener
 *     callbacks registered inside initializeNative — FirebaseMessaging.addListener is mocked
 *     to resolve immediately; invoking the callbacks requires capturing the arguments
 *     passed to addListener. Those are exercised in the addListener-callback tests below.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationPayload } from "../../types/notifications";

// ─── Mock Capacitor core ───────────────────────────────────────────────────────
const mockGetPlatform = vi.fn<[], string>(() => "ios");
const mockIsNativePlatform = vi.fn<[], boolean>(() => true);

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: mockGetPlatform,
    isNativePlatform: mockIsNativePlatform,
  },
}));

// ─── Mock @capacitor-firebase/messaging ──────────────────────────────────────
const mockCheckPermissions = vi.fn<[], Promise<{ receive: string }>>(() =>
  Promise.resolve({ receive: "granted" })
);
const mockRequestPermissions = vi.fn<[], Promise<{ receive: string }>>(() =>
  Promise.resolve({ receive: "granted" })
);
const mockGetToken = vi.fn<[], Promise<{ token: string }>>(() =>
  Promise.resolve({ token: "mock-fcm-token" })
);
const mockAddListener = vi.fn<
  [event: string, handler: (payload: unknown) => void],
  Promise<void>
>(() => Promise.resolve());

vi.mock("@capacitor-firebase/messaging", () => ({
  FirebaseMessaging: {
    checkPermissions: mockCheckPermissions,
    requestPermissions: mockRequestPermissions,
    getToken: mockGetToken,
    addListener: mockAddListener,
  },
}));

// ─── Mock fetch (used by sendTokenToServer) ───────────────────────────────────
const mockFetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  } as Response)
);
vi.stubGlobal("fetch", mockFetch);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * The singleton lives on the module-level class. We reset it between tests by
 * re-importing the module with a cleared module registry.
 */
async function freshService() {
  // Clear module cache so each test gets a pristine singleton.
  vi.resetModules();
  // Re-apply mocks in the fresh module scope.
  vi.mock("@capacitor/core", () => ({
    Capacitor: {
      getPlatform: mockGetPlatform,
      isNativePlatform: mockIsNativePlatform,
    },
  }));
  vi.mock("@capacitor-firebase/messaging", () => ({
    FirebaseMessaging: {
      checkPermissions: mockCheckPermissions,
      requestPermissions: mockRequestPermissions,
      getToken: mockGetToken,
      addListener: mockAddListener,
    },
  }));
  const { FirebaseMessagingService } = await import(
    "../../services/firebase-messaging.service"
  );
  return FirebaseMessagingService;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FirebaseMessagingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsNativePlatform.mockReturnValue(true);
    mockGetPlatform.mockReturnValue("ios");
    mockCheckPermissions.mockResolvedValue({ receive: "granted" });
    mockRequestPermissions.mockResolvedValue({ receive: "granted" });
    mockGetToken.mockResolvedValue({ token: "mock-fcm-token" });
    mockAddListener.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);
  });

  // ── Singleton ──────────────────────────────────────────────────────────────

  describe("getInstance", () => {
    it("always returns the same instance", async () => {
      const Service = await freshService();
      const a = Service.getInstance();
      const b = Service.getInstance();
      expect(a).toBe(b);
    });
  });

  // ── initialize — native path ───────────────────────────────────────────────

  describe("initialize()", () => {
    it("initializes on a native platform and sets isInitialized", async () => {
      const Service = await freshService();
      const svc = Service.getInstance();
      await svc.initialize();
      // Verify native path was used: getToken must have been called.
      expect(mockGetToken).toHaveBeenCalledOnce();
    });

    it("does not re-initialize when called a second time", async () => {
      const Service = await freshService();
      const svc = Service.getInstance();
      await svc.initialize();
      await svc.initialize(); // second call
      expect(mockGetToken).toHaveBeenCalledOnce();
    });

    it("throws and re-throws when not on a native platform", async () => {
      mockIsNativePlatform.mockReturnValue(false);
      const Service = await freshService();
      const svc = Service.getInstance();
      await expect(svc.initialize()).rejects.toThrow(
        "Push notifications are only supported on mobile devices"
      );
    });

    it("registers three listeners after initializing natively", async () => {
      const Service = await freshService();
      const svc = Service.getInstance();
      await svc.initialize();
      const events = mockAddListener.mock.calls.map((c) => c[0] as string);
      expect(events).toContain("tokenReceived");
      expect(events).toContain("notificationReceived");
      expect(events).toContain("notificationActionPerformed");
    });

    // ── Permission branches inside initializeNative ────────────────────────

    it("requests permission when status is 'prompt' and proceeds if granted", async () => {
      mockCheckPermissions.mockResolvedValue({ receive: "prompt" });
      mockRequestPermissions.mockResolvedValue({ receive: "granted" });
      const Service = await freshService();
      const svc = Service.getInstance();
      await expect(svc.initialize()).resolves.toBeUndefined();
      expect(mockRequestPermissions).toHaveBeenCalledOnce();
      expect(mockGetToken).toHaveBeenCalledOnce();
    });

    it("throws when permission is prompted but not granted", async () => {
      mockCheckPermissions.mockResolvedValue({ receive: "prompt" });
      mockRequestPermissions.mockResolvedValue({ receive: "denied" });
      const Service = await freshService();
      const svc = Service.getInstance();
      await expect(svc.initialize()).rejects.toThrow(
        "Push notification permission denied"
      );
    });

    it("throws when permission status is already 'denied'", async () => {
      mockCheckPermissions.mockResolvedValue({ receive: "denied" });
      const Service = await freshService();
      const svc = Service.getInstance();
      await expect(svc.initialize()).rejects.toThrow(
        "Push notification permission denied"
      );
    });
  });

  // ── getFCMToken ────────────────────────────────────────────────────────────

  describe("getFCMToken()", () => {
    it("returns null before initialization", async () => {
      const Service = await freshService();
      const svc = Service.getInstance();
      expect(svc.getFCMToken()).toBeNull();
    });

    it("returns the token after initialization", async () => {
      const Service = await freshService();
      const svc = Service.getInstance();
      await svc.initialize();
      expect(svc.getFCMToken()).toBe("mock-fcm-token");
    });
  });

  // ── refreshToken ───────────────────────────────────────────────────────────

  describe("refreshToken()", () => {
    it("returns the new token on native platform", async () => {
      mockGetToken.mockResolvedValue({ token: "refreshed-token" });
      const Service = await freshService();
      const svc = Service.getInstance();
      const token = await svc.refreshToken();
      expect(token).toBe("refreshed-token");
      expect(svc.getFCMToken()).toBe("refreshed-token");
    });

    it("returns null on web platform (error is swallowed)", async () => {
      mockIsNativePlatform.mockReturnValue(false);
      const Service = await freshService();
      const svc = Service.getInstance();
      const token = await svc.refreshToken();
      expect(token).toBeNull();
    });

    it("returns null when getToken rejects (error is swallowed)", async () => {
      mockGetToken.mockRejectedValue(new Error("network failure"));
      const Service = await freshService();
      const svc = Service.getInstance();
      const token = await svc.refreshToken();
      expect(token).toBeNull();
    });
  });

  // ── Handler registration and clearing ─────────────────────────────────────

  describe("registerMessageHandler / clearMessageHandlers", () => {
    it("calls the registered handler when a message arrives", async () => {
      const Service = await freshService();
      const svc = Service.getInstance();
      await svc.initialize();

      const received: NotificationPayload[] = [];
      svc.registerMessageHandler((p) => received.push(p));

      // Capture the notificationReceived listener and invoke it.
      const notificationReceivedCall = mockAddListener.mock.calls.find(
        (c) => (c[0] as string) === "notificationReceived"
      );
      expect(notificationReceivedCall).toBeDefined();
      const notificationReceivedCb = notificationReceivedCall![1] as (
        event: unknown
      ) => void;

      notificationReceivedCb({
        notification: { title: "Hello", body: "World", data: { id: "42" } },
      });

      expect(received).toHaveLength(1);
      expect(received[0].title).toBe("Hello");
    });

    it("stops calling handler after clearMessageHandlers()", async () => {
      const Service = await freshService();
      const svc = Service.getInstance();
      await svc.initialize();

      const received: NotificationPayload[] = [];
      svc.registerMessageHandler((p) => received.push(p));
      svc.clearMessageHandlers();

      const notificationReceivedCall = mockAddListener.mock.calls.find(
        (c) => (c[0] as string) === "notificationReceived"
      );
      const cb = notificationReceivedCall![1] as (event: unknown) => void;
      cb({ notification: { title: "T", body: "B", data: {} } });

      // No handlers registered; default path runs silently.
      expect(received).toHaveLength(0);
    });

    it("calls multiple registered handlers", async () => {
      const Service = await freshService();
      const svc = Service.getInstance();
      await svc.initialize();

      const calls: string[] = [];
      svc.registerMessageHandler(() => calls.push("first"));
      svc.registerMessageHandler(() => calls.push("second"));

      const notificationReceivedCall = mockAddListener.mock.calls.find(
        (c) => (c[0] as string) === "notificationReceived"
      );
      const cb = notificationReceivedCall![1] as (event: unknown) => void;
      cb({ notification: { title: "T", body: "B", data: {} } });

      expect(calls).toEqual(["first", "second"]);
    });
  });

  describe("registerActionHandler / clearActionHandlers", () => {
    it("calls the action handler when a notification action fires", async () => {
      const Service = await freshService();
      const svc = Service.getInstance();
      await svc.initialize();

      const received: NotificationPayload[] = [];
      svc.registerActionHandler((p) => received.push(p));

      const actionCall = mockAddListener.mock.calls.find(
        (c) => (c[0] as string) === "notificationActionPerformed"
      );
      const cb = actionCall![1] as (event: unknown) => void;
      cb({ notification: { title: "Action", body: "Tap", data: {} } });

      expect(received).toHaveLength(1);
      expect(received[0].title).toBe("Action");
    });

    it("stops calling handler after clearActionHandlers()", async () => {
      const Service = await freshService();
      const svc = Service.getInstance();
      await svc.initialize();

      const received: NotificationPayload[] = [];
      svc.registerActionHandler((p) => received.push(p));
      svc.clearActionHandlers();

      const actionCall = mockAddListener.mock.calls.find(
        (c) => (c[0] as string) === "notificationActionPerformed"
      );
      const cb = actionCall![1] as (event: unknown) => void;
      cb({ notification: { title: "T", body: "B", data: {} } });

      expect(received).toHaveLength(0);
    });
  });

  // ── parseNotificationData — field resolution branches ─────────────────────

  describe("parseNotificationData (exercised via message handler)", () => {
    /**
     * Helper: initializes a fresh service, registers a capturing handler,
     * fires the notificationReceived listener with `rawMessage`, and returns
     * the captured payload.
     */
    async function parse(rawMessage: unknown): Promise<NotificationPayload> {
      const Service = await freshService();
      const svc = Service.getInstance();
      await svc.initialize();

      const captured: NotificationPayload[] = [];
      svc.registerMessageHandler((p) => captured.push(p));

      const notificationReceivedCall = mockAddListener.mock.calls.find(
        (c) => (c[0] as string) === "notificationReceived"
      );
      const cb = notificationReceivedCall![1] as (event: unknown) => void;
      cb({ notification: rawMessage });

      return captured[0];
    }

    it("extracts id, title, body from top-level fields", async () => {
      const payload = await parse({ id: "99", title: "T", body: "B", data: {} });
      expect(payload.id).toBe("99");
      expect(payload.title).toBe("T");
      expect(payload.body).toBe("B");
    });

    it("falls back to data.id when top-level id is missing", async () => {
      const payload = await parse({ title: "T", body: "B", data: { id: "data-id" } });
      expect(payload.id).toBe("data-id");
    });

    it("falls back to Date.now() string when both id fields are absent", async () => {
      const before = Date.now();
      const payload = await parse({ title: "T", body: "B", data: {} });
      const after = Date.now();
      const id = Number(payload.id);
      expect(id).toBeGreaterThanOrEqual(before);
      expect(id).toBeLessThanOrEqual(after);
    });

    it("reads title from nested notification.title when top-level title is absent", async () => {
      const payload = await parse({
        body: "B",
        notification: { title: "Nested Title" },
        data: {},
      });
      expect(payload.title).toBe("Nested Title");
    });

    it("defaults title to 'Paperwork Notificatie' when both title fields are absent", async () => {
      const payload = await parse({ body: "B", data: {} });
      expect(payload.title).toBe("Paperwork Notificatie");
    });

    it("reads body from nested notification.body when top-level body is absent", async () => {
      const payload = await parse({
        title: "T",
        notification: { body: "Nested body" },
        data: {},
      });
      expect(payload.body).toBe("Nested body");
    });

    it("defaults body to empty string when no body field is present", async () => {
      const payload = await parse({ title: "T", data: {} });
      expect(payload.body).toBe("");
    });

    it("parses data.customData JSON string when present", async () => {
      const custom = { key: "value", count: 3 };
      const payload = await parse({
        title: "T",
        body: "B",
        data: { customData: JSON.stringify(custom) },
      });
      expect(payload.data).toEqual(custom);
    });

    it("passes data object through directly when customData is absent", async () => {
      const data = { notificationId: "n-123", extra: "info" };
      const payload = await parse({ title: "T", body: "B", data });
      expect(payload.data).toEqual(data);
    });

    it("exposes data.notificationId as notificationId field", async () => {
      const payload = await parse({
        title: "T",
        body: "B",
        data: { notificationId: "notif-456" },
      });
      expect(payload.notificationId).toBe("notif-456");
    });

    it("handles entirely empty message gracefully", async () => {
      const payload = await parse({});
      expect(payload.title).toBe("Paperwork Notificatie");
      expect(payload.body).toBe("");
      expect(typeof payload.id).toBe("string");
    });
  });

  // ── tokenReceived listener ─────────────────────────────────────────────────

  describe("tokenReceived listener (registered during initializeNative)", () => {
    it("updates fcmToken when a refreshed token arrives", async () => {
      const Service = await freshService();
      const svc = Service.getInstance();
      await svc.initialize();

      const tokenReceivedCall = mockAddListener.mock.calls.find(
        (c) => (c[0] as string) === "tokenReceived"
      );
      expect(tokenReceivedCall).toBeDefined();
      const cb = tokenReceivedCall![1] as (event: { token: string }) => void;

      cb({ token: "refreshed-token-from-event" });
      expect(svc.getFCMToken()).toBe("refreshed-token-from-event");
    });
  });

  // ── checkPermissions ───────────────────────────────────────────────────────

  describe("checkPermissions()", () => {
    it.each([
      { receive: "granted", expected: { granted: true, denied: false, prompt: false } },
      { receive: "denied", expected: { granted: false, denied: true, prompt: false } },
      { receive: "prompt", expected: { granted: false, denied: false, prompt: true } },
    ])(
      "maps receive='$receive' correctly",
      async ({ receive, expected }) => {
        mockCheckPermissions.mockResolvedValue({ receive });
        const Service = await freshService();
        const svc = Service.getInstance();
        const result = await svc.checkPermissions();
        expect(result).toEqual(expected);
      }
    );

    it("throws on web platform", async () => {
      mockIsNativePlatform.mockReturnValue(false);
      const Service = await freshService();
      const svc = Service.getInstance();
      await expect(svc.checkPermissions()).rejects.toThrow(
        "Push notifications are only supported on mobile devices"
      );
    });
  });

  // ── requestPermissions ─────────────────────────────────────────────────────

  describe("requestPermissions()", () => {
    it("returns true when receive is 'granted'", async () => {
      mockRequestPermissions.mockResolvedValue({ receive: "granted" });
      const Service = await freshService();
      const svc = Service.getInstance();
      expect(await svc.requestPermissions()).toBe(true);
    });

    it("returns false when receive is 'denied'", async () => {
      mockRequestPermissions.mockResolvedValue({ receive: "denied" });
      const Service = await freshService();
      const svc = Service.getInstance();
      expect(await svc.requestPermissions()).toBe(false);
    });

    it("throws on web platform", async () => {
      mockIsNativePlatform.mockReturnValue(false);
      const Service = await freshService();
      const svc = Service.getInstance();
      await expect(svc.requestPermissions()).rejects.toThrow(
        "Push notifications are only supported on mobile devices"
      );
    });
  });
});
