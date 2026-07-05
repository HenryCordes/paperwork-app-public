import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, userEvent, waitFor } from "../test-utils";
import LogoutButton from "../../components/LogoutButton";

const logout = vi.fn().mockResolvedValue(undefined);
const push = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ logout }),
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

describe("LogoutButton", () => {
  it("logs out and navigates to /login when clicked", async () => {
    // IonButton renders as a custom element <ion-button> in jsdom; no native
    // button role is registered, so we query the element directly.
    const { container } = renderWithProviders(<LogoutButton />);
    const btn = container.querySelector("ion-button")!;
    await userEvent.click(btn);
    expect(logout).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });
});
