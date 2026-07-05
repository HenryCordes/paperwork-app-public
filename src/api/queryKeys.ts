/**
 * Centralized query keys for React Query
 *
 * Using this pattern helps maintain consistency across the app
 * and makes refactoring easier when query keys need to change.
 */

export const QueryKeys = {
  // Auth related keys
  auth: {
    base: ["auth"] as const,
    user: () => [...QueryKeys.auth.base, "user"] as const,
    token: () => [...QueryKeys.auth.base, "token"] as const,
    profile: () => [...QueryKeys.auth.base, "profile"] as const,
  },

  // Expenses related keys
  expenses: {
    base: ["expenses"] as const,
    list: (offset: number = 0) =>
      [...QueryKeys.expenses.base, "list", offset] as const,
    detail: (id?: string) =>
      [...QueryKeys.expenses.base, "detail", id] as const,
  },

  // Invoices related keys
  invoices: {
    base: ["invoices"] as const,
    list: (offset: number = 0) =>
      [...QueryKeys.invoices.base, "list", offset] as const,
    detail: (id?: string) =>
      [...QueryKeys.invoices.base, "detail", id] as const,
  },

  // Emails related keys
  emails: {
    base: ["emails"] as const,
    list: (offset: number = 0) =>
      [...QueryKeys.emails.base, "list", offset] as const,
    detail: (id?: string) => [...QueryKeys.emails.base, "detail", id] as const,
  },

  // Receipt related keys
  receipts: {
    base: ["receipts"] as const,
    all: () => [...QueryKeys.receipts.base, "all"] as const,
    detail: (id: string) => [...QueryKeys.receipts.base, "detail", id] as const,
  },

  // Contacts related keys
  contacts: {
    base: ["contacts"] as const,
    list: (offset: number = 0) =>
      [...QueryKeys.contacts.base, "list", offset] as const,
    detail: (id?: string) =>
      [...QueryKeys.contacts.base, "detail", id] as const,
  },

  // Notifications related keys
  notifications: {
    base: ["notifications"] as const,
    tokens: () => [...QueryKeys.notifications.base, "tokens"] as const,
    settings: () => [...QueryKeys.notifications.base, "settings"] as const,
    list: (filter?: { status?: string; type?: string }) =>
      [...QueryKeys.notifications.base, "list", filter] as const,
    unreadCount: () =>
      [...QueryKeys.notifications.base, "unread-count"] as const,
  },

  // Taxes related keys
  taxes: {
    base: ["taxes"] as const,
    periods: () => [...QueryKeys.taxes.base, "periods"] as const,
    summary: (params: { periodType: string; period: string; year: number }) =>
      [...QueryKeys.taxes.base, "summary", params] as const,
    deadline: (periodType: string) =>
      [...QueryKeys.taxes.base, "deadline", periodType] as const,
  },

  // BTW pre-check related keys
  btwPrecheck: {
    base: ["btwPrecheck"] as const,
    latest: (period: string, year: number) =>
      [...QueryKeys.btwPrecheck.base, "latest", period, year] as const,
    preferences: () =>
      [...QueryKeys.btwPrecheck.base, "preferences"] as const,
  },
};

export default QueryKeys;
