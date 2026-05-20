import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthUser } from "@/lib/api/auth";

import { clearAuthToken } from "@/lib/auth/token-storage";
import { unregisterDevicePushToken } from "@/lib/push/unregister-device-push-token";

const USER_KEY = "findmine_auth_user";

export async function saveAuthUser(user: AuthUser): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function loadAuthUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (
      parsed &&
      typeof parsed.id === "string" &&
      typeof parsed.email === "string"
    ) {
      return {
        id: parsed.id,
        email: parsed.email,
        displayName:
          parsed.displayName === undefined || parsed.displayName === null
            ? null
            : String(parsed.displayName),
        biometricLoginEnabled:
          typeof parsed.biometricLoginEnabled === "boolean"
            ? parsed.biometricLoginEnabled
            : false,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Sign-out: clears token and cached member locally; keeps biometric prefs and credentials so Face ID / fingerprint login still works after sign-out. */
export async function clearAuthSession(): Promise<void> {
  await unregisterDevicePushToken();
  await clearAuthToken();
  await AsyncStorage.removeItem(USER_KEY);
}
