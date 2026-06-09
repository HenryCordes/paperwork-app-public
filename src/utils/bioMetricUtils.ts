import { isPlatform } from "@ionic/react";
import { BiometricType } from "../hooks/biometrics/biometrics.types";

export const getBiometricName = (
  biometryType: BiometricType,
  upperCase?: boolean
) => {
  let androidFace = "face unlock";
  let androidFingerprint = "fingerprint unlock";
  let biometric = "biometrisch";

  if (upperCase) {
    androidFace = "Face Unlock";
    androidFingerprint = "Fingerprint Unlock";
    biometric = "Biometrisch";
  }

  if (biometryType === BiometricType.FACE) {
    return isPlatform("android") ? androidFace : "FaceId";
  } else if (biometryType === BiometricType.FINGERPRINT) {
    return isPlatform("android") ? androidFingerprint : "TouchId";
  }
  return biometric;
};
