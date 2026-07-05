import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "../test-utils";
import VatReturnDeadlineCard from "../../components/VatReturnDeadlineCard";
import type { TaxDeadlineResponse } from "../../api/types/taxes";
import type {
  VatNotificationPreferences,
  VatNotificationPreferencesResponse,
} from "../../api/types/vatNotificationPreferences";

const push = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useHistory: () => ({ push }) };
});

const mockUseTaxDeadline = vi.fn();
const mockUseVatNotificationPreferences = vi.fn();

vi.mock("../../hooks/useTaxes", () => ({
  useTaxDeadline: (...args: unknown[]) => mockUseTaxDeadline(...args),
}));

vi.mock("../../hooks/useVatNotificationPreferences", () => ({
  useVatNotificationPreferences: () => mockUseVatNotificationPreferences(),
}));

const makeDeadlineResponse = (
  overrides: Partial<TaxDeadlineResponse["data"]> = {}
): TaxDeadlineResponse => ({
  success: true,
  data: {
    deadline: "2024-07-31T00:00:00.000Z",
    label: "Q2 2024",
    daysUntilDeadline: 7,
    periodType: "quarterly",
    ...overrides,
  },
});

const basePrefs: VatNotificationPreferences = {
  _id: "pref-1",
  userId: "user-1",
  tenantId: "tenant-1",
  emailNotifications: true,
  inAppNotifications: true,
  pushNotifications: false,
  advanceWarningDays: 7,
  secondReminderEnabled: false,
  secondReminderDays: 3,
  monthlyNotifications: false,
  quarterlyNotifications: true,
  yearlyNotifications: false,
  pushNotificationToken: null,
  pushNotificationPlatform: null,
  lastNotificationSent: null,
  notificationsSentCount: 0,
  preferredLanguage: "nl",
  timezone: "Europe/Amsterdam",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const makePrefsResponse = (
  overrides: Partial<VatNotificationPreferences> = {}
): VatNotificationPreferencesResponse => ({
  success: true,
  data: { ...basePrefs, ...overrides },
});

beforeEach(() => {
  vi.clearAllMocks();
  // Safe defaults — 7 days until deadline, quarterly prefs
  mockUseVatNotificationPreferences.mockReturnValue({
    data: makePrefsResponse(),
    isLoading: false,
    isError: false,
  });
  mockUseTaxDeadline.mockReturnValue({
    data: makeDeadlineResponse(),
    isLoading: false,
    isError: false,
  });
});

describe("VatReturnDeadlineCard", () => {
  describe("visibility rules", () => {
    it("renders nothing while loading", () => {
      mockUseTaxDeadline.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });
      const { container } = renderWithProviders(<VatReturnDeadlineCard />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when deadline data is absent", () => {
      mockUseTaxDeadline.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });
      const { container } = renderWithProviders(<VatReturnDeadlineCard />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when daysUntilDeadline > 14", () => {
      mockUseTaxDeadline.mockReturnValue({
        data: makeDeadlineResponse({ daysUntilDeadline: 15 }),
        isLoading: false,
        isError: false,
      });
      const { container } = renderWithProviders(<VatReturnDeadlineCard />);
      expect(container.firstChild).toBeNull();
    });

    it("renders when daysUntilDeadline is exactly 14", () => {
      mockUseTaxDeadline.mockReturnValue({
        data: makeDeadlineResponse({ daysUntilDeadline: 14 }),
        isLoading: false,
        isError: false,
      });
      const { container } = renderWithProviders(<VatReturnDeadlineCard />);
      expect(container.querySelector("ion-card")).not.toBeNull();
    });
  });

  describe("full variant (default)", () => {
    it("shows the deadline heading and label", () => {
      renderWithProviders(<VatReturnDeadlineCard />);
      expect(screen.getByText("Volgende BTW Deadline")).toBeInTheDocument();
      expect(screen.getByText(/Q2 2024/)).toBeInTheDocument();
    });

    it("shows singular 'dag' when daysUntilDeadline is 1", () => {
      mockUseTaxDeadline.mockReturnValue({
        data: makeDeadlineResponse({ daysUntilDeadline: 1 }),
        isLoading: false,
        isError: false,
      });
      renderWithProviders(<VatReturnDeadlineCard />);
      expect(screen.getByText(/1 dag resterend/)).toBeInTheDocument();
    });

    it("shows plural 'dagen' when daysUntilDeadline > 1", () => {
      renderWithProviders(<VatReturnDeadlineCard />);
      expect(screen.getByText(/7 dagen resterend/)).toBeInTheDocument();
    });

    it("applies 'urgent' class when daysUntilDeadline <= 3", () => {
      mockUseTaxDeadline.mockReturnValue({
        data: makeDeadlineResponse({ daysUntilDeadline: 3 }),
        isLoading: false,
        isError: false,
      });
      const { container } = renderWithProviders(<VatReturnDeadlineCard />);
      expect(container.querySelector("ion-card.urgent")).not.toBeNull();
    });

    it("applies 'warning' class when daysUntilDeadline is 4–7", () => {
      mockUseTaxDeadline.mockReturnValue({
        data: makeDeadlineResponse({ daysUntilDeadline: 7 }),
        isLoading: false,
        isError: false,
      });
      const { container } = renderWithProviders(<VatReturnDeadlineCard />);
      expect(container.querySelector("ion-card.warning")).not.toBeNull();
    });

    it("applies 'info' class when daysUntilDeadline is 8–14", () => {
      mockUseTaxDeadline.mockReturnValue({
        data: makeDeadlineResponse({ daysUntilDeadline: 10 }),
        isLoading: false,
        isError: false,
      });
      const { container } = renderWithProviders(<VatReturnDeadlineCard />);
      expect(container.querySelector("ion-card.info")).not.toBeNull();
    });

    it("navigates to /taxes when the card is clicked", async () => {
      const { container } = renderWithProviders(<VatReturnDeadlineCard />);
      const card = container.querySelector("ion-card")!;
      card.click();
      await waitFor(() => expect(push).toHaveBeenCalledWith("/taxes"));
    });
  });

  describe("compact variant", () => {
    it("shows 'BTW Deadline' heading instead of full heading", () => {
      renderWithProviders(<VatReturnDeadlineCard variant="compact" />);
      expect(screen.getByText("BTW Deadline")).toBeInTheDocument();
      expect(screen.queryByText("Volgende BTW Deadline")).toBeNull();
    });

    it("shows the days remaining in compact view", () => {
      renderWithProviders(<VatReturnDeadlineCard variant="compact" />);
      expect(screen.getByText(/7 dagen resterend/)).toBeInTheDocument();
    });

    it("navigates to /taxes when compact card is clicked", async () => {
      const { container } = renderWithProviders(
        <VatReturnDeadlineCard variant="compact" />
      );
      const card = container.querySelector("ion-card")!;
      card.click();
      await waitFor(() => expect(push).toHaveBeenCalledWith("/taxes"));
    });
  });

  describe("daysUntilDeadline at/below zero", () => {
    it("still renders the card when daysUntilDeadline is 0 (not filtered by >14 guard)", () => {
      // The source only hides the card when daysUntilDeadline > 14.
      // At 0 the card renders; the copy reads "0 dagen resterend".
      // FIXME: "0 dagen resterend" is semantically nonsensical (deadline passed).
      // Source should handle <= 0 separately (e.g. "Deadline verlopen").
      mockUseTaxDeadline.mockReturnValue({
        data: makeDeadlineResponse({ daysUntilDeadline: 0 }),
        isLoading: false,
        isError: false,
      });
      const { container } = renderWithProviders(<VatReturnDeadlineCard />);
      expect(container.querySelector("ion-card")).not.toBeNull();
      // Pin current (imperfect) behavior — update when source is fixed.
      expect(screen.getByText(/0 dagen resterend/)).toBeInTheDocument();
    });

    it("still renders the card when daysUntilDeadline is negative", () => {
      // FIXME: same as above — negative days also shows nonsensical copy.
      mockUseTaxDeadline.mockReturnValue({
        data: makeDeadlineResponse({ daysUntilDeadline: -3 }),
        isLoading: false,
        isError: false,
      });
      const { container } = renderWithProviders(<VatReturnDeadlineCard />);
      expect(container.querySelector("ion-card")).not.toBeNull();
      // daysUntilDeadline <= 3 triggers "urgent" CSS class
      expect(container.querySelector("ion-card.urgent")).not.toBeNull();
    });
  });

  describe("period type selection from preferences", () => {
    it("uses quarterly period type when quarterlyNotifications is true", () => {
      mockUseVatNotificationPreferences.mockReturnValue({
        data: makePrefsResponse({ quarterlyNotifications: true }),
        isLoading: false,
        isError: false,
      });
      renderWithProviders(<VatReturnDeadlineCard />);
      expect(mockUseTaxDeadline).toHaveBeenCalledWith("quarterly");
    });

    it("uses monthly period type when only monthlyNotifications is true", () => {
      mockUseVatNotificationPreferences.mockReturnValue({
        data: makePrefsResponse({
          quarterlyNotifications: false,
          monthlyNotifications: true,
          yearlyNotifications: false,
        }),
        isLoading: false,
        isError: false,
      });
      renderWithProviders(<VatReturnDeadlineCard />);
      expect(mockUseTaxDeadline).toHaveBeenCalledWith("monthly");
    });

    it("uses yearly period type when only yearlyNotifications is true", () => {
      mockUseVatNotificationPreferences.mockReturnValue({
        data: makePrefsResponse({
          quarterlyNotifications: false,
          monthlyNotifications: false,
          yearlyNotifications: true,
        }),
        isLoading: false,
        isError: false,
      });
      renderWithProviders(<VatReturnDeadlineCard />);
      expect(mockUseTaxDeadline).toHaveBeenCalledWith("yearly");
    });

    it("defaults to quarterly when no preferences data", () => {
      mockUseVatNotificationPreferences.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });
      renderWithProviders(<VatReturnDeadlineCard />);
      expect(mockUseTaxDeadline).toHaveBeenCalledWith("quarterly");
    });

    it("quarterly wins over monthly when both are true (getPrimaryPeriodType precedence)", () => {
      // getPrimaryPeriodType checks quarterlyNotifications first; if both flags
      // are true, "quarterly" should be returned, not "monthly".
      mockUseVatNotificationPreferences.mockReturnValue({
        data: makePrefsResponse({
          quarterlyNotifications: true,
          monthlyNotifications: true,
          yearlyNotifications: false,
        }),
        isLoading: false,
        isError: false,
      });
      renderWithProviders(<VatReturnDeadlineCard />);
      expect(mockUseTaxDeadline).toHaveBeenCalledWith("quarterly");
    });
  });
});
