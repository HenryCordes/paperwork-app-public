import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { renderWithProviders, waitFor, screen } from "../test-utils";
import { BiometricOptIn } from "../../components/BiometricOptIn/BiometricOptIn";
import { BiometricType } from "../../hooks/biometrics/biometrics.types";
import type { BiometricAvailability } from "../../hooks/biometrics/biometrics.types";

const checkAvailability = vi.fn();
const saveCredentials = vi.fn();
const setBiometricsEnabled = vi.fn();

vi.mock("../../hooks/biometrics/useBiometrics", () => ({
  useBiometrics: () => ({
    checkAvailability,
    saveCredentials,
    setBiometricsEnabled,
    authenticate: vi.fn(),
    getCredentials: vi.fn(),
    deleteCredentials: vi.fn(),
    clearCredentials: vi.fn(),
    isBiometricsEnabled: vi.fn(),
    getBiometricType: vi.fn(),
  }),
}));

const defaultProps = {
  username: "testuser",
  password: "secret",
  onComplete: vi.fn(),
  onCancel: vi.fn(),
};

function makeAvailability(overrides: Partial<BiometricAvailability> = {}): BiometricAvailability {
  return {
    isAvailable: true,
    biometryType: BiometricType.FINGERPRINT,
    canUseFingerprint: true,
    canUseFaceID: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BiometricOptIn — loading state", () => {
  it("shows loading card while checkAvailability is pending", () => {
    // Never resolves during this render
    checkAvailability.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<BiometricOptIn {...defaultProps} />);
    expect(screen.getByText("Checking biometric capabilities...")).toBeDefined();
  });
});

describe("BiometricOptIn — biometrics not available", () => {
  it("renders 'not available' card and calls onComplete(false) when continuing", async () => {
    checkAvailability.mockResolvedValue(
      makeAvailability({ isAvailable: false })
    );
    const onComplete = vi.fn();
    const { container } = renderWithProviders(
      <BiometricOptIn {...defaultProps} onComplete={onComplete} />
    );

    await waitFor(() =>
      expect(screen.getByText("Biometrics Not Available")).toBeDefined()
    );

    expect(
      screen.getByText("Continue without Biometrics")
    ).toBeDefined();

    const btn = container.querySelector("ion-button")!;
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onComplete).toHaveBeenCalledWith(false);
  });
});

describe("BiometricOptIn — fingerprint device", () => {
  beforeEach(() => {
    checkAvailability.mockResolvedValue(
      makeAvailability({ isAvailable: true, canUseFingerprint: true, canUseFaceID: false })
    );
  });

  it("renders opt-in card with Fingerprint label", async () => {
    renderWithProviders(<BiometricOptIn {...defaultProps} />);
    await waitFor(() => {
      const headings = screen.getAllByText("Enable Fingerprint");
      expect(headings.length).toBeGreaterThan(0);
    });
    // The card title shows the biometric name
    expect(screen.getAllByText(/Fingerprint/).length).toBeGreaterThan(0);
  });

  it("calls onComplete(false) without saving credentials when toggle is off and Continue is clicked", async () => {
    const onComplete = vi.fn();
    const { container } = renderWithProviders(
      <BiometricOptIn {...defaultProps} onComplete={onComplete} />
    );

    await waitFor(() => expect(screen.getByText("Continue")).toBeDefined());

    // Toggle is off by default — click Continue directly
    const btn = container.querySelector("ion-button")!;
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(saveCredentials).not.toHaveBeenCalled();
    expect(setBiometricsEnabled).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(false);
  });

  it("saves credentials and enables biometrics when toggle is on and Continue is clicked", async () => {
    saveCredentials.mockResolvedValue(true);
    setBiometricsEnabled.mockResolvedValue(undefined);
    const onComplete = vi.fn();

    const { container } = renderWithProviders(
      <BiometricOptIn {...defaultProps} onComplete={onComplete} />
    );

    await waitFor(() => expect(screen.getByText("Continue")).toBeDefined());

    // Simulate IonToggle ionChange with checked: true — wrap in act so React
    // processes the state update before we fire the button click.
    const toggle = container.querySelector("ion-toggle")!;
    await act(async () => {
      toggle.dispatchEvent(
        new CustomEvent("ionChange", {
          bubbles: true,
          detail: { checked: true },
        })
      );
    });

    await act(async () => {
      const continueBtn = container.querySelector("ion-button")!;
      continueBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() =>
      expect(saveCredentials).toHaveBeenCalledWith({
        username: "testuser",
        password: "secret",
        server: "nl.paperwork.app.auth",
      })
    );
    expect(setBiometricsEnabled).toHaveBeenCalledWith(true);
    expect(onComplete).toHaveBeenCalledWith(true);
  });
});

describe("BiometricOptIn — Face ID device", () => {
  beforeEach(() => {
    checkAvailability.mockResolvedValue(
      makeAvailability({
        isAvailable: true,
        canUseFaceID: true,
        canUseFingerprint: false,
        biometryType: BiometricType.FACE,
      })
    );
  });

  it("renders Face Recognition label for Face ID devices", async () => {
    renderWithProviders(<BiometricOptIn {...defaultProps} />);
    await waitFor(() => {
      const matches = screen.getAllByText("Enable Face Recognition");
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});

describe("BiometricOptIn — cancel", () => {
  it("calls onCancel when the close icon is clicked", async () => {
    checkAvailability.mockResolvedValue(makeAvailability());
    const onCancel = vi.fn();
    const { container } = renderWithProviders(
      <BiometricOptIn {...defaultProps} onCancel={onCancel} />
    );

    await waitFor(() => {
      const matches = screen.getAllByText(/Enable/);
      expect(matches.length).toBeGreaterThan(0);
    });

    // The IonIcon with closeOutline sits inside IonCardHeader
    const closeIcon = container.querySelector("ion-icon")!;
    closeIcon.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("BiometricOptIn — checkAvailability error", () => {
  it("falls back to 'not available' when checkAvailability throws", async () => {
    checkAvailability.mockRejectedValue(new Error("sensor error"));
    renderWithProviders(<BiometricOptIn {...defaultProps} />);

    // After the error the loading state resolves; biometricAvailable stays false
    await waitFor(() =>
      expect(screen.getByText("Biometrics Not Available")).toBeDefined()
    );
  });
});
