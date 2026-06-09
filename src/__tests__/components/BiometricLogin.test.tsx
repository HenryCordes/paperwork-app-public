import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, waitFor } from "../test-utils";
import { BiometricLogin } from "../../components/BiometricLogin/BiometricLogin";
import { BiometricType } from "../../hooks/biometrics/biometrics.types";

// --- mock shape ---
const authenticate = vi.fn();
const checkAvailability = vi.fn();
const getCredentials = vi.fn();
const isBiometricsEnabled = vi.fn();

vi.mock("../../hooks/biometrics/useBiometrics", () => ({
  useBiometrics: () => ({
    authenticate,
    checkAvailability,
    getCredentials,
    isBiometricsEnabled,
    saveCredentials: vi.fn(),
    deleteCredentials: vi.fn(),
    clearCredentials: vi.fn(),
    setBiometricsEnabled: vi.fn(),
    getBiometricType: vi.fn(),
  }),
}));

// --- helpers ---
const onLoginSuccess = vi.fn();
const onCancel = vi.fn();

const defaultProps = {
  onLoginSuccess,
  onCancel,
  autoPrompt: false, // Prevent auto-prompt so tests stay deterministic
};

/** Set up mocks for a fully available, enabled biometric environment. */
function setupAvailable(biometryType = BiometricType.FINGERPRINT) {
  isBiometricsEnabled.mockResolvedValue(true);
  checkAvailability.mockResolvedValue({ isAvailable: true, biometryType });
  authenticate.mockResolvedValue(true);
  getCredentials.mockResolvedValue({ username: "alice", password: "s3cr3t", server: "paperwork" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BiometricLogin", () => {
  describe("loading state", () => {
    it("shows a loading card while checking biometric status", () => {
      // Never resolve so we stay in the loading branch
      isBiometricsEnabled.mockReturnValue(new Promise(() => {}));
      const { container } = renderWithProviders(<BiometricLogin {...defaultProps} />);
      // The loading branch renders an IonCard with specific title text
      const cardTitle = container.querySelector("ion-card-title");
      expect(cardTitle?.textContent).toContain("Biometrie controleren");
    });
  });

  describe("biometrics not enabled", () => {
    it("calls onCancel when biometrics is not enabled by the user", async () => {
      isBiometricsEnabled.mockResolvedValue(false);
      renderWithProviders(<BiometricLogin {...defaultProps} />);
      await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    });
  });

  describe("device unavailable", () => {
    it("renders error message when biometrics is unavailable on the device", async () => {
      isBiometricsEnabled.mockResolvedValue(true);
      checkAvailability.mockResolvedValue({ isAvailable: false });
      const { container } = renderWithProviders(<BiometricLogin {...defaultProps} />);
      await waitFor(() =>
        expect(container.querySelector("p")?.textContent).toContain(
          "Biometric authentication is not available"
        )
      );
    });
  });

  describe("ready state — fingerprint", () => {
    it("renders the authenticate button", async () => {
      setupAvailable(BiometricType.FINGERPRINT);
      const { container } = renderWithProviders(<BiometricLogin {...defaultProps} />);
      // Wait for loading to resolve
      await waitFor(() =>
        expect(container.querySelector("ion-button")).not.toBeNull()
      );
      const btn = container.querySelector("ion-button");
      // Button label includes the biometric name (TouchId on non-android)
      expect(btn?.textContent).toContain("Gebruik");
    });

    it("calls authenticate with the expected options on button click", async () => {
      setupAvailable(BiometricType.FINGERPRINT);
      const { container } = renderWithProviders(<BiometricLogin {...defaultProps} />);
      await waitFor(() =>
        expect(container.querySelector("ion-button")).not.toBeNull()
      );

      const btn = container.querySelector("ion-button") as Element;
      // IonButton in jsdom is a custom element; fire a click on its host node
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      await waitFor(() => expect(authenticate).toHaveBeenCalledTimes(1));
      const callArgs = authenticate.mock.calls[0][0];
      expect(callArgs).toMatchObject({
        reason: "Log in op je Paperwork account",
        allowDeviceCredential: true,
      });
      expect(typeof callArgs.title).toBe("string");
      expect(typeof callArgs.subtitle).toBe("string");
    });

    it("calls onLoginSuccess with credentials after successful auth", async () => {
      setupAvailable(BiometricType.FINGERPRINT);
      const { container } = renderWithProviders(<BiometricLogin {...defaultProps} />);
      await waitFor(() =>
        expect(container.querySelector("ion-button")).not.toBeNull()
      );

      container
        .querySelector("ion-button")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));

      await waitFor(() =>
        expect(onLoginSuccess).toHaveBeenCalledWith("alice", "s3cr3t")
      );
    });
  });

  describe("ready state — face", () => {
    it("renders a card title containing the face biometric name", async () => {
      setupAvailable(BiometricType.FACE);
      const { container } = renderWithProviders(<BiometricLogin {...defaultProps} />);
      await waitFor(() =>
        expect(container.querySelector("ion-button")).not.toBeNull()
      );
      const cardTitle = container.querySelector("ion-card-title");
      // On non-android jsdom isPlatform('android') is false → name is "FaceId"
      expect(cardTitle?.textContent).toContain("FaceId");
    });
  });

  describe("error branches after successful init", () => {
    it("shows error text when authenticate returns false", async () => {
      isBiometricsEnabled.mockResolvedValue(true);
      checkAvailability.mockResolvedValue({
        isAvailable: true,
        biometryType: BiometricType.FINGERPRINT,
      });
      authenticate.mockResolvedValue(false);
      const { container } = renderWithProviders(<BiometricLogin {...defaultProps} />);
      await waitFor(() =>
        expect(container.querySelector("ion-button")).not.toBeNull()
      );

      container
        .querySelector("ion-button")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));

      await waitFor(() =>
        expect(container.querySelector("p")?.textContent).toContain(
          "Biometrische verificatie mislukt"
        )
      );
      expect(onLoginSuccess).not.toHaveBeenCalled();
    });

    it("shows error text when getCredentials returns null", async () => {
      isBiometricsEnabled.mockResolvedValue(true);
      checkAvailability.mockResolvedValue({
        isAvailable: true,
        biometryType: BiometricType.FINGERPRINT,
      });
      authenticate.mockResolvedValue(true);
      getCredentials.mockResolvedValue(null);
      const { container } = renderWithProviders(<BiometricLogin {...defaultProps} />);
      await waitFor(() =>
        expect(container.querySelector("ion-button")).not.toBeNull()
      );

      container
        .querySelector("ion-button")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));

      await waitFor(() =>
        expect(container.querySelector("p")?.textContent).toContain(
          "Geen opgeslagen inloggegevens"
        )
      );
      expect(onLoginSuccess).not.toHaveBeenCalled();
    });

    it("shows generic error text when authenticate throws", async () => {
      isBiometricsEnabled.mockResolvedValue(true);
      checkAvailability.mockResolvedValue({
        isAvailable: true,
        biometryType: BiometricType.FINGERPRINT,
      });
      authenticate.mockRejectedValue(new Error("hardware failure"));
      const { container } = renderWithProviders(<BiometricLogin {...defaultProps} />);
      await waitFor(() =>
        expect(container.querySelector("ion-button")).not.toBeNull()
      );

      container
        .querySelector("ion-button")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));

      await waitFor(() =>
        expect(container.querySelector("p")?.textContent).toContain(
          "Authenticatie mislukt"
        )
      );
    });
  });
});
