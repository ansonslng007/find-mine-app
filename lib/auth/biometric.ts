import * as LocalAuthentication from "expo-local-authentication";
import type { LocalAuthenticationError } from "expo-local-authentication";
import { Platform } from "react-native";

/**
 * Whether the device supports Face ID / fingerprint-only login (biometric enrolled, not just device PIN / pattern).
 */
export async function canUseBiometricLogin(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) {
    return false;
  }
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) {
    return false;
  }

  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (
    level !== LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK &&
    level !== LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG
  ) {
    return false;
  }

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.length === 0) {
    return false;
  }

  return true;
}

export type BiometricAuthenticateResult =
  | { ok: true }
  | { ok: false; error: LocalAuthenticationError | "unknown" };

/**
 * Authenticate with Face ID / fingerprint only; avoid falling back to device PIN / pattern when possible.
 * On Android we use biometricsSecurityLevel `weak` for devices limited to Class-2 biometric hardware.
 */
export async function authenticateWithBiometric(
  promptMessage: string,
  cancelLabel: string,
): Promise<BiometricAuthenticateResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      // In Expo Go, disableDeviceFallback: true forces NSFaceIDUsageDescription to be checked,
      // and throws missing_usage_description without a custom Dev Client build.
      // Keep false so biometric flows can be tested in Expo Go.
      disableDeviceFallback: false,
      ...(Platform.OS === "ios"
        ? {
            fallbackLabel: "",
          }
        : {}),
      ...(Platform.OS === "android"
        ? {
            biometricsSecurityLevel: "weak",
          }
        : {}),
    });

    if (result.success) {
      return { ok: true };
    }
    return { ok: false, error: result.error || "unknown" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // During development: if you hit missing_usage_description and cannot rebuild easily,
    // return unknown for normal failure handling, or temporarily return success here for testing only.
    return { ok: false, error: `unknown_exception: ${msg}` as any };
  }
}
