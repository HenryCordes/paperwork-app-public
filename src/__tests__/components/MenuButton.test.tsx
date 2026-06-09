import { describe, it, expect } from "vitest";
import { renderWithProviders } from "../test-utils";
import MenuButton from "../../components/MenuButton";

// MenuButton is a pure presentational component: no hooks, no navigation,
// no data fetching. Tests verify the Ionic custom-element tree it produces.
// Ionic custom elements do NOT expose standard ARIA roles in jsdom — query
// with container.querySelector instead of getByRole.

describe("MenuButton", () => {
  it("renders an IonButtons wrapper with slot=start", () => {
    const { container } = renderWithProviders(<MenuButton />);
    const ionButtons = container.querySelector("ion-buttons");
    expect(ionButtons).not.toBeNull();
    expect(ionButtons!.getAttribute("slot")).toBe("start");
  });

  it("renders an IonMenuButton inside the wrapper", () => {
    const { container } = renderWithProviders(<MenuButton />);
    const ionMenuButton = container.querySelector("ion-menu-button");
    expect(ionMenuButton).not.toBeNull();
  });

  it("renders an IonIcon inside IonMenuButton", () => {
    const { container } = renderWithProviders(<MenuButton />);
    const ionMenuButton = container.querySelector("ion-menu-button");
    const ionIcon = ionMenuButton!.querySelector("ion-icon");
    expect(ionIcon).not.toBeNull();
  });
});
