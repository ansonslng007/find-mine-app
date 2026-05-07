import type { LocalAuthenticationError } from "expo-local-authentication";

/**
 * On Android, `expo-local-authentication` returns strings such as `not_available`, `unable_to_process`
 * (see androidx BiometricPrompt). Each must be mapped explicitly or UI falls back to a generic failure message.
 */
export function mapBiometricErrorToMessage(
  error:
    | LocalAuthenticationError
    | "unknown"
    | "missing_usage_description",
  t: (key: string) => string,
): string {
  switch (error) {
    case "user_cancel":
    case "app_cancel":
      return "";
    case "not_enrolled":
      return t("auth.biometricErrors.notEnrolled");
    case "lockout":
      return t("auth.biometricErrors.lockout");
    case "passcode_not_set":
      return t("auth.biometricErrors.passcodeNotSet");
    case "missing_usage_description":
      return t("auth.biometricErrors.missingUsageDescription");
    case "not_available":
      return t("auth.biometricErrors.notAvailable");
    case "unable_to_process":
      return t("auth.biometricErrors.unableToProcess");
    case "timeout":
      return t("auth.biometricErrors.timeout");
    case "no_space":
      return t("auth.biometricErrors.noSpace");
    default:
      return `${t("auth.biometricErrors.failed")} (${error})`;
  }
}
