import { describe, it, expect, vi, beforeEach } from "vitest";
import { History } from "history";
import { NotificationNavigationService } from "../../services/notification-navigation.service";
import { StoredNotification } from "../../types/notifications";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeHistory = (): { push: ReturnType<typeof vi.fn> } & Pick<History, "push"> => ({
  push: vi.fn(),
});

const baseNotification = (
  overrides: Partial<StoredNotification>
): StoredNotification => ({
  _id: "notif-1",
  title: "Test",
  body: "Test body",
  type: "general",
  read: false,
  received: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NotificationNavigationService.navigateFromNotification", () => {
  let history: ReturnType<typeof makeHistory>;

  beforeEach(() => {
    history = makeHistory();
  });

  // -------------------------------------------------------------------------
  // expense
  // -------------------------------------------------------------------------
  describe('type: "expense"', () => {
    it("pushes /expenses/edit/:id when action=edit and targetId is present", () => {
      NotificationNavigationService.navigateFromNotification(
        baseNotification({ type: "expense", action: "edit", targetId: "exp-42" }),
        history as unknown as History
      );
      expect(history.push).toHaveBeenCalledOnce();
      expect(history.push).toHaveBeenCalledWith("/expenses/edit/exp-42");
    });

    it("pushes /expenses/:id when action=view and targetId is present", () => {
      NotificationNavigationService.navigateFromNotification(
        baseNotification({ type: "expense", action: "view", targetId: "exp-7" }),
        history as unknown as History
      );
      expect(history.push).toHaveBeenCalledOnce();
      expect(history.push).toHaveBeenCalledWith("/expenses/exp-7");
    });

    it("pushes /expenses/:id when action is absent and targetId is present", () => {
      NotificationNavigationService.navigateFromNotification(
        baseNotification({ type: "expense", targetId: "exp-99" }),
        history as unknown as History
      );
      expect(history.push).toHaveBeenCalledOnce();
      expect(history.push).toHaveBeenCalledWith("/expenses/exp-99");
    });

    it("falls back to /expenses when targetId is absent", () => {
      NotificationNavigationService.navigateFromNotification(
        baseNotification({ type: "expense" }),
        history as unknown as History
      );
      expect(history.push).toHaveBeenCalledOnce();
      expect(history.push).toHaveBeenCalledWith("/expenses");
    });

    it("falls back to /expenses when action=edit but targetId is absent", () => {
      NotificationNavigationService.navigateFromNotification(
        baseNotification({ type: "expense", action: "edit" }),
        history as unknown as History
      );
      expect(history.push).toHaveBeenCalledOnce();
      expect(history.push).toHaveBeenCalledWith("/expenses");
    });
  });

  // -------------------------------------------------------------------------
  // invoice
  // -------------------------------------------------------------------------
  describe('type: "invoice"', () => {
    it("pushes /invoices/edit/:id when action=edit and targetId is present", () => {
      NotificationNavigationService.navigateFromNotification(
        baseNotification({ type: "invoice", action: "edit", targetId: "inv-1" }),
        history as unknown as History
      );
      expect(history.push).toHaveBeenCalledOnce();
      expect(history.push).toHaveBeenCalledWith("/invoices/edit/inv-1");
    });

    it("pushes /invoices/:id when action=view and targetId is present", () => {
      NotificationNavigationService.navigateFromNotification(
        baseNotification({ type: "invoice", action: "view", targetId: "inv-2" }),
        history as unknown as History
      );
      expect(history.push).toHaveBeenCalledOnce();
      expect(history.push).toHaveBeenCalledWith("/invoices/inv-2");
    });

    it("pushes /invoices/:id when action is absent and targetId is present", () => {
      NotificationNavigationService.navigateFromNotification(
        baseNotification({ type: "invoice", targetId: "inv-3" }),
        history as unknown as History
      );
      expect(history.push).toHaveBeenCalledOnce();
      expect(history.push).toHaveBeenCalledWith("/invoices/inv-3");
    });

    it("falls back to /invoices when targetId is absent", () => {
      NotificationNavigationService.navigateFromNotification(
        baseNotification({ type: "invoice" }),
        history as unknown as History
      );
      expect(history.push).toHaveBeenCalledOnce();
      expect(history.push).toHaveBeenCalledWith("/invoices");
    });

    it("falls back to /invoices when action=edit but targetId is absent", () => {
      NotificationNavigationService.navigateFromNotification(
        baseNotification({ type: "invoice", action: "edit" }),
        history as unknown as History
      );
      expect(history.push).toHaveBeenCalledOnce();
      expect(history.push).toHaveBeenCalledWith("/invoices");
    });
  });

  // -------------------------------------------------------------------------
  // vat_deadline
  // -------------------------------------------------------------------------
  describe('type: "vat_deadline"', () => {
    it("always pushes /taxes regardless of action or targetId", () => {
      const variants: Array<Partial<StoredNotification>> = [
        { type: "vat_deadline" },
        { type: "vat_deadline", targetId: "vat-1" },
        { type: "vat_deadline", action: "edit", targetId: "vat-2" },
        { type: "vat_deadline", action: "view" },
      ];

      for (const overrides of variants) {
        history = makeHistory();
        NotificationNavigationService.navigateFromNotification(
          baseNotification(overrides),
          history as unknown as History
        );
        expect(history.push).toHaveBeenCalledOnce();
        expect(history.push).toHaveBeenCalledWith("/taxes");
      }
    });
  });

  // -------------------------------------------------------------------------
  // btw_precheck
  // -------------------------------------------------------------------------
  describe('type: "btw_precheck"', () => {
    it("always pushes /taxes regardless of action or targetId", () => {
      const variants: Array<Partial<StoredNotification>> = [
        { type: "btw_precheck" },
        { type: "btw_precheck", targetId: "report-1" },
        { type: "btw_precheck", action: "view", targetId: "report-2" },
      ];

      for (const overrides of variants) {
        history = makeHistory();
        NotificationNavigationService.navigateFromNotification(
          baseNotification(overrides),
          history as unknown as History
        );
        expect(history.push).toHaveBeenCalledOnce();
        expect(history.push).toHaveBeenCalledWith("/taxes");
      }
    });
  });

  // -------------------------------------------------------------------------
  // general
  // -------------------------------------------------------------------------
  describe('type: "general"', () => {
    it("pushes /dashboard for general notifications", () => {
      NotificationNavigationService.navigateFromNotification(
        baseNotification({ type: "general" }),
        history as unknown as History
      );
      expect(history.push).toHaveBeenCalledOnce();
      expect(history.push).toHaveBeenCalledWith("/dashboard");
    });

    it("ignores targetId and action for general notifications", () => {
      NotificationNavigationService.navigateFromNotification(
        baseNotification({ type: "general", targetId: "some-id", action: "edit" }),
        history as unknown as History
      );
      expect(history.push).toHaveBeenCalledOnce();
      expect(history.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  // -------------------------------------------------------------------------
  // push is called exactly once per invocation in all branches
  // -------------------------------------------------------------------------
  describe("push is called exactly once per invocation", () => {
    const cases: Array<[string, Partial<StoredNotification>]> = [
      ["expense/edit/id",     { type: "expense",      action: "edit", targetId: "x" }],
      ["expense/view/id",     { type: "expense",      action: "view", targetId: "x" }],
      ["expense/no-id",       { type: "expense" }],
      ["invoice/edit/id",     { type: "invoice",      action: "edit", targetId: "x" }],
      ["invoice/view/id",     { type: "invoice",      action: "view", targetId: "x" }],
      ["invoice/no-id",       { type: "invoice" }],
      ["vat_deadline",        { type: "vat_deadline" }],
      ["btw_precheck",        { type: "btw_precheck" }],
      ["general",             { type: "general" }],
    ];

    it.each(cases)("case: %s → push called once", (_label, overrides) => {
      const h = makeHistory();
      NotificationNavigationService.navigateFromNotification(
        baseNotification(overrides),
        h as unknown as History
      );
      expect(h.push).toHaveBeenCalledOnce();
    });
  });
});
