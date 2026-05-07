import AsyncStorage from "@react-native-async-storage/async-storage";

import { clearBiometricCredentials } from "@/lib/auth/biometric-credentials";

const BIOMETRIC_PREF_KEY = "@findmine_biometric_login";

export async function getBiometricLoginEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(BIOMETRIC_PREF_KEY);
  return v === "1";
}

export async function setBiometricLoginEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_PREF_KEY, enabled ? "1" : "0");
  if (!enabled) {
    await clearBiometricCredentials();
  }
}
