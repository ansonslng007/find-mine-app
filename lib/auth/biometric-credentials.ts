import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const EMAIL_KEY = "findmine_bio_email";
const PASSWORD_KEY = "findmine_bio_password";

export async function saveBiometricCredentials(
  email: string,
  password: string,
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  await SecureStore.setItemAsync(EMAIL_KEY, email);
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
}

export async function hasBiometricCredentials(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }
  const email = await SecureStore.getItemAsync(EMAIL_KEY);
  return email != null && email.length > 0;
}

export async function loadBiometricCredentials(): Promise<{
  email: string;
  password: string;
} | null> {
  if (Platform.OS === "web") {
    return null;
  }
  const email = await SecureStore.getItemAsync(EMAIL_KEY);
  const password = await SecureStore.getItemAsync(PASSWORD_KEY);
  if (!email || !password) {
    return null;
  }
  return { email, password };
}

export async function clearBiometricCredentials(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  try {
    await SecureStore.deleteItemAsync(EMAIL_KEY);
  } catch {
    /* ignore */
  }
  try {
    await SecureStore.deleteItemAsync(PASSWORD_KEY);
  } catch {
    /* ignore */
  }
}
