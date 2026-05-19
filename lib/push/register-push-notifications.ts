import { shouldSuppressChatNotificationBanner } from "@/lib/chat/chat-ui-focus";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

function conversationIdFromNotificationData(
  data: unknown,
): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const row = data as { type?: unknown; conversationId?: unknown };
  if (row.type !== "chat_message") {
    return null;
  }
  if (typeof row.conversationId !== "string" || !row.conversationId) {
    return null;
  }
  return row.conversationId;
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const convId = conversationIdFromNotificationData(
      notification.request.content.data,
    );
    const suppress = shouldSuppressChatNotificationBanner(convId);
    return {
      shouldShowAlert: !suppress,
      shouldPlaySound: !suppress,
      shouldSetBadge: true,
      shouldShowBanner: !suppress,
      shouldShowList: !suppress,
    };
  },
});

export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  await Notifications.setNotificationChannelAsync("chat-messages", {
    name: "Chat messages",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#2563EB",
  });
}

export async function obtainExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  await ensureAndroidNotificationChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== "string" || !projectId) {
    return null;
  }

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  return pushToken.data;
}

export async function syncPushTokenWithBackend(
  register: (token: string, platform: "ios" | "android") => Promise<void>,
): Promise<string | null> {
  const token = await obtainExpoPushToken();
  if (!token) {
    return null;
  }
  const platform = Platform.OS === "ios" ? "ios" : "android";
  await register(token, platform);
  return token;
}

export async function clearPushTokenFromBackend(
  token: string,
  unregister: (token: string) => Promise<void>,
): Promise<void> {
  try {
    await unregister(token);
  } catch {
    // ignore logout cleanup failures
  }
}
