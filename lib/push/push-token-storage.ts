import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "expo_push_token";

export async function loadStoredPushToken(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw?.trim() ? raw.trim() : null;
}

export async function saveStoredPushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEY, token);
}

export async function clearStoredPushToken(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
