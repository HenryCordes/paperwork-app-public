import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "../test-utils";
import BtwPrecheckSettingsCard from "../../components/BtwPrecheckSettingsCard";

const mockGetSettings = vi.fn();
const mockUpdateSettingsMutate = vi.fn();
const mockUseBtwPrecheckPreferences = vi.fn();
const mockUpdatePrefsMutate = vi.fn();

vi.mock("../../hooks/useSettings", () => ({
  default: () => ({
    getSettings: mockGetSettings,
    updateSettings: { mutate: mockUpdateSettingsMutate },
  }),
}));

vi.mock("../../hooks/useBtwPrecheck", () => ({
  useBtwPrecheckPreferences: () => mockUseBtwPrecheckPreferences(),
  useUpdateBtwPrecheckPreferences: () => ({
    mutate: mockUpdatePrefsMutate,
  }),
}));

const mockShowToast = vi.fn();
vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const makeSettingsResponse = (btwPrecheck?: {
  missingDocuments: boolean;
  vatArithmetic: boolean;
  duplicates: boolean;
  historyAnomalies: boolean;
}) => ({
  success: true,
  data: {
    _id: "settings-1",
    country: "Nederland",
    currency: "EUR",
    companyName: "Acme",
    street: "Hoofdstraat",
    houseNumber: "1",
    postalCode: "1000AA",
    city: "Amsterdam",
    phoneNumber: "0600000000",
    companyEmail: "acme@example.com",
    taxNumber: "NL000000000B01",
    chamberOfCommerceNumber: "12345678",
    bankName: "ING",
    bankIBAN: "NL00INGB0000000000",
    taxPercentage: "21",
    createdAt: "2026-01-01T00:00:00.000Z",
    tenantId: "tenant-1",
    __v: 0,
    agbCode: "",
    companyLogo: "",
    registerNumber: "",
    website: "",
    btwPrecheck,
  },
});

const makePrefsResponse = (overrides = {}) => ({
  success: true,
  data: {
    _id: "pref-1",
    userId: "user-1",
    tenantId: "tenant-1",
    emailNotifications: true,
    inAppNotifications: true,
    pushNotifications: false,
    preferredLanguage: "nl" as const,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  },
});

describe("BtwPrecheckSettingsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockReturnValue({
      data: makeSettingsResponse({
        missingDocuments: true,
        vatArithmetic: true,
        duplicates: false,
        historyAnomalies: true,
      }),
      isLoading: false,
    });
    mockUseBtwPrecheckPreferences.mockReturnValue({
      data: makePrefsResponse(),
      isLoading: false,
    });
  });

  it("renders all four check toggles with their current values", () => {
    renderWithProviders(<BtwPrecheckSettingsCard />);
    expect(screen.getByText("Ontbrekende documenten")).toBeInTheDocument();
    expect(screen.getByText("BTW-rekenfouten")).toBeInTheDocument();
    expect(screen.getByText("Mogelijke duplicaten")).toBeInTheDocument();
    expect(screen.getByText("Afwijkingen in geschiedenis")).toBeInTheDocument();
  });

  it("defaults check toggles to true when settings.btwPrecheck is undefined", () => {
    mockGetSettings.mockReturnValue({
      data: makeSettingsResponse(undefined),
      isLoading: false,
    });
    renderWithProviders(<BtwPrecheckSettingsCard />);
    const toggle = screen.getByTestId(
      "toggle-missingDocuments"
    ) as unknown as HTMLElement & { checked: boolean };
    expect(toggle.checked).toBe(true);
  });

  it("updates settings with the toggled check merged into the existing four", async () => {
    renderWithProviders(<BtwPrecheckSettingsCard />);
    const toggle = screen.getByTestId("toggle-duplicates");
    await userEvent.click(toggle);

    expect(mockUpdateSettingsMutate).toHaveBeenCalledWith({
      btwPrecheck: {
        missingDocuments: true,
        vatArithmetic: true,
        duplicates: true,
        historyAnomalies: true,
      },
    });
  });

  it("renders all three notification-channel toggles", () => {
    renderWithProviders(<BtwPrecheckSettingsCard />);
    expect(screen.getByText("E-mail")).toBeInTheDocument();
    expect(screen.getByText("In-app")).toBeInTheDocument();
    expect(screen.getByText("Push")).toBeInTheDocument();
  });

  it("updates notification preferences when a channel toggle is changed", async () => {
    renderWithProviders(<BtwPrecheckSettingsCard />);
    const toggle = screen.getByTestId("toggle-pushNotifications");
    await userEvent.click(toggle);

    expect(mockUpdatePrefsMutate).toHaveBeenCalledWith(
      { pushNotifications: true },
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });

  it("shows an unavailable message in the Meldingen section when the backend flag is off (503)", () => {
    mockUseBtwPrecheckPreferences.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 503 } },
    });
    renderWithProviders(<BtwPrecheckSettingsCard />);
    expect(
      screen.getByText("BTW pre-check is momenteel niet beschikbaar.")
    ).toBeInTheDocument();
    expect(screen.queryByText("E-mail")).not.toBeInTheDocument();
    expect(screen.queryByTestId("toggle-emailNotifications")).toBeNull();
  });

  it("still renders the Controles section when preferences are in an error state", () => {
    mockUseBtwPrecheckPreferences.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 503 } },
    });
    renderWithProviders(<BtwPrecheckSettingsCard />);
    expect(screen.getByText("Ontbrekende documenten")).toBeInTheDocument();
  });

  it("shows a generic message in the Meldingen section for a non-503 error", () => {
    mockUseBtwPrecheckPreferences.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("network down"),
    });
    renderWithProviders(<BtwPrecheckSettingsCard />);
    expect(
      screen.getByText("Kon de meldingsvoorkeuren niet laden.")
    ).toBeInTheDocument();
  });

  it("shows an error toast when saving a notification preference fails", async () => {
    mockUpdatePrefsMutate.mockImplementation((_vars, opts) =>
      opts.onError(new Error("boom"))
    );
    renderWithProviders(<BtwPrecheckSettingsCard />);
    const toggle = screen.getByTestId("toggle-pushNotifications");
    await userEvent.click(toggle);

    expect(mockShowToast).toHaveBeenCalledWith(
      "Kon de instelling niet opslaan.",
      "error"
    );
  });
});
