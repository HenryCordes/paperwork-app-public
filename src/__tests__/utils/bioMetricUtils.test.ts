import { describe, it, expect, vi, beforeEach } from "vitest";
import { BiometricType } from "../../hooks/biometrics/biometrics.types";

// isPlatform is the only external dependency; mock the entire module so we can
// control android vs non-android per test.
const mockIsPlatform = vi.fn<[platform: string], boolean>();

vi.mock("@ionic/react", () => ({
  isPlatform: (platform: string) => mockIsPlatform(platform),
}));

// Import AFTER the mock is registered so the module receives the stub.
import { getBiometricName } from "../../utils/bioMetricUtils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const onAndroid = () => mockIsPlatform.mockReturnValue(true);
const onIOS = () => mockIsPlatform.mockReturnValue(false);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getBiometricName
// ---------------------------------------------------------------------------

describe("getBiometricName", () => {
  describe("BiometricType.FACE", () => {
    it.each([
      // [platform label, setupFn, upperCase, expected]
      ["android, lowercase", onAndroid, undefined, "face unlock"],
      ["android, upperCase", onAndroid, true, "Face Unlock"],
      ["iOS, lowercase", onIOS, undefined, "FaceId"],
      ["iOS, upperCase", onIOS, true, "FaceId"],
    ])("%s", (_label, setup, upperCase, expected) => {
      setup();
      expect(getBiometricName(BiometricType.FACE, upperCase)).toBe(expected);
    });
  });

  describe("BiometricType.FINGERPRINT", () => {
    it.each([
      ["android, lowercase", onAndroid, undefined, "fingerprint unlock"],
      ["android, upperCase", onAndroid, true, "Fingerprint Unlock"],
      ["iOS, lowercase", onIOS, undefined, "TouchId"],
      ["iOS, upperCase", onIOS, true, "TouchId"],
    ])("%s", (_label, setup, upperCase, expected) => {
      setup();
      expect(getBiometricName(BiometricType.FINGERPRINT, upperCase)).toBe(expected);
    });
  });

  describe("fallback (non-FACE / non-FINGERPRINT)", () => {
    it.each([
      // Platform does not affect the fallback — just verify both cases return consistently.
      ["NONE, no upperCase, android", onAndroid, BiometricType.NONE, undefined, "biometrisch"],
      ["NONE, upperCase, android", onAndroid, BiometricType.NONE, true, "Biometrisch"],
      ["NONE, no upperCase, iOS", onIOS, BiometricType.NONE, undefined, "biometrisch"],
      ["NONE, upperCase, iOS", onIOS, BiometricType.NONE, true, "Biometrisch"],
      ["IRIS, no upperCase", onAndroid, BiometricType.IRIS, undefined, "biometrisch"],
      ["IRIS, upperCase", onAndroid, BiometricType.IRIS, true, "Biometrisch"],
    ])("%s", (_label, setup, biometryType, upperCase, expected) => {
      setup();
      expect(getBiometricName(biometryType, upperCase)).toBe(expected);
    });
  });

  describe("isPlatform call contract", () => {
    it('calls isPlatform with "android" for FACE', () => {
      onIOS();
      getBiometricName(BiometricType.FACE);
      expect(mockIsPlatform).toHaveBeenCalledWith("android");
    });

    it('calls isPlatform with "android" for FINGERPRINT', () => {
      onIOS();
      getBiometricName(BiometricType.FINGERPRINT);
      expect(mockIsPlatform).toHaveBeenCalledWith("android");
    });

    it("does not call isPlatform for fallback types (NONE)", () => {
      onAndroid();
      getBiometricName(BiometricType.NONE);
      expect(mockIsPlatform).not.toHaveBeenCalled();
    });
  });
});
