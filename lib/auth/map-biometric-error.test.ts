import { describe, expect, it } from "@jest/globals";

import { mapBiometricErrorToMessage } from "./map-biometric-error";

const t = (key: string) => `translated:${key}`;

describe("mapBiometricErrorToMessage", () => {
  it("suppresses user and app cancellation messages", () => {
    expect(mapBiometricErrorToMessage("user_cancel", t)).toBe("");
    expect(mapBiometricErrorToMessage("app_cancel", t)).toBe("");
  });

  it("maps common biometric errors to translated messages", () => {
    expect(mapBiometricErrorToMessage("not_enrolled", t)).toBe(
      "translated:auth.biometricErrors.notEnrolled",
    );
    expect(mapBiometricErrorToMessage("lockout", t)).toBe(
      "translated:auth.biometricErrors.lockout",
    );
    expect(mapBiometricErrorToMessage("missing_usage_description", t)).toBe(
      "translated:auth.biometricErrors.missingUsageDescription",
    );
    expect(mapBiometricErrorToMessage("not_available", t)).toBe(
      "translated:auth.biometricErrors.notAvailable",
    );
  });

  it("keeps the raw error in fallback messages", () => {
    expect(mapBiometricErrorToMessage("unknown", t)).toBe(
      "translated:auth.biometricErrors.failed (unknown)",
    );
  });
});
