import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "../test-utils";
import SideMenu from "../../components/SideMenu";
import { APP_VERSION } from "../../common/versionConstants";

// ── data-layer mocks ────────────────────────────────────────────────────────

const logout = vi.fn();
const push = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ logout }),
}));

vi.mock("../../hooks/useProfile", () => ({
  useProfile: () => ({ data: undefined, isLoading: false, isError: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useHistory: () => ({ push }) };
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ── helpers ─────────────────────────────────────────────────────────────────

/** Collect visible text content from all IonLabel elements rendered inside the menu. */
const getMenuLabels = (container: HTMLElement): string[] => {
  // IonLabel renders as <ion-label> custom element in jsdom
  return Array.from(container.querySelectorAll("ion-label")).map(
    (el) => el.textContent ?? ""
  );
};

// ── tests ────────────────────────────────────────────────────────────────────

describe("SideMenu", () => {
  it("renders app name and version in the header", () => {
    const { getByText } = renderWithProviders(<SideMenu />);

    expect(getByText("Paperwork")).toBeTruthy();
    expect(getByText(`v.${APP_VERSION}`)).toBeTruthy();
  });

  it("renders all expected nav labels", () => {
    const { container } = renderWithProviders(<SideMenu />);

    const labels = getMenuLabels(container);

    const expected = [
      "Dashboard",
      "Kosten",
      "Facturen",
      "Emails",
      "Contacten",
      "Belasting",
      "Notificaties",
      "Uitloggen",
    ];

    for (const label of expected) {
      expect(labels).toContain(label);
    }
  });

  it("shows fallback 'Profiel' text when profile data is not yet loaded", () => {
    const { getByText } = renderWithProviders(<SideMenu />);

    // profile is undefined → component falls back to "Profiel"
    expect(getByText("Profiel")).toBeTruthy();
  });

  it("calls logout when the 'Uitloggen' item is clicked", async () => {
    // IonItem renders as <ion-item> in jsdom — no native button role.
    // We locate the logout item by its text content and click the custom element.
    const { container } = renderWithProviders(<SideMenu />);

    // Find the ion-item that contains the "Uitloggen" label
    const logoutItem = Array.from(
      container.querySelectorAll<HTMLElement>("ion-item")
    ).find((el) => el.textContent?.includes("Uitloggen"));

    expect(logoutItem).toBeTruthy();
    logoutItem!.click();

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("each nav item has the correct routerLink attribute", () => {
    const { container } = renderWithProviders(<SideMenu />);

    const routerPaths: Array<[string, string]> = [
      ["Dashboard", "/dashboard"],
      ["Kosten", "/expenses"],
      ["Facturen", "/invoices"],
      ["Emails", "/emails"],
      ["Contacten", "/contacts"],
      ["Belasting", "/taxes"],
      ["Notificaties", "/notifications"],
    ];

    for (const [label, path] of routerPaths) {
      const item = Array.from(
        container.querySelectorAll<HTMLElement>("ion-item")
      ).find((el) => el.textContent?.includes(label));

      expect(item, `Expected ion-item for "${label}"`).toBeTruthy();
      expect(
        item!.getAttribute("router-link"),
        `Expected routerLink "${path}" for "${label}"`
      ).toBe(path);
    }
  });
});

// ── profile data branch — separate describe with its own mock factory ───────

describe("SideMenu — profile data loaded", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("displays name and companyName from profile when available", async () => {
    // Use a module-scoped mock ref so the factory can reference mutable state
    const profileData = { name: "Jane Doe", companyName: "Acme BV" };

    vi.doMock("../../hooks/useProfile", () => ({
      useProfile: () => ({
        data: profileData,
        isLoading: false,
        isError: false,
      }),
    }));
    vi.doMock("../../hooks/useAuth", () => ({
      useAuth: () => ({ logout }),
    }));
    vi.doMock("react-router-dom", async () => {
      const actual = await vi.importActual<typeof import("react-router-dom")>(
        "react-router-dom"
      );
      return { ...actual, useHistory: () => ({ push }) };
    });

    const { default: SideMenuFresh } = await import(
      "../../components/SideMenu/index"
    );

    const { getByText } = renderWithProviders(<SideMenuFresh />);

    expect(getByText("Jane Doe")).toBeTruthy();
    expect(getByText("Acme BV")).toBeTruthy();
  });
});
