import { unregisterPushToken } from "@/lib/api/push-tokens";
import { clearPushTokenFromBackend } from "@/lib/push/register-push-notifications";
import {
  clearStoredPushToken,
  loadStoredPushToken,
} from "@/lib/push/push-token-storage";

export async function unregisterDevicePushToken(): Promise<void> {
  const token = await loadStoredPushToken();
  if (token) {
    await clearPushTokenFromBackend(token, unregisterPushToken);
    await clearStoredPushToken();
  }
}
