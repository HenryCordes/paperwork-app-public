/**
 * Isolated test for Toast cancel-button handler, using vi.mock to intercept
 * the IonToast render and capture the `buttons` prop.
 *
 * Split into its own file so the module-level vi.mock does not affect the
 * main Toast.test.tsx which exercises the real Ionic custom element behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "../test-utils";
import type { ToastMessage } from "../../contexts/ToastContext";

// Capture the most-recently-rendered buttons prop.
let capturedButtons: Array<{
  text: string;
  role: string;
  handler: () => void;
}> = [];

vi.mock("@ionic/react", async () => {
  const actual =
    await vi.importActual<typeof import("@ionic/react")>("@ionic/react");
  return {
    ...actual,
    IonToast: (props: {
      buttons?: Array<{ text: string; role: string; handler: () => void }>;
    }) => {
      capturedButtons = props.buttons ?? [];
      return null;
    },
  };
});

// Import AFTER vi.mock so the mock is in place.
const { Toast } = await import("../../components/Toast");

beforeEach(() => {
  vi.clearAllMocks();
  capturedButtons = [];
});

describe("Toast — cancel button handler (mocked IonToast)", () => {
  it("cancel button handler calls onDismiss", () => {
    const onDismiss = vi.fn();
    const toast: ToastMessage = { message: "Bye", type: "info" };

    renderWithProviders(<Toast toast={toast} onDismiss={onDismiss} />);

    const cancelBtn = capturedButtons.find((b) => b.role === "cancel");
    expect(cancelBtn).toBeDefined();
    expect(cancelBtn!.text).toBe("✕");
    cancelBtn!.handler();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
