import { apiClient } from "./client";

export async function registerPushToken(
  token: string,
  platform: "ios" | "android",
): Promise<void> {
  await apiClient.put("/api/v1/push-tokens", { token, platform });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await apiClient.delete("/api/v1/push-tokens", { data: { token } });
}
