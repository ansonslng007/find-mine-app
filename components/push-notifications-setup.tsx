import {
  shouldSuppressChatNotificationBanner,
} from "@/lib/chat/chat-ui-focus";
import { invalidateChatListQueries } from "@/lib/chat/invalidate-chat-queries";
import { registerPushToken, unregisterPushToken } from "@/lib/api/push-tokens";
import { getAuthToken } from "@/lib/auth/token-storage";
import {
  clearPushTokenFromBackend,
  syncPushTokenWithBackend,
} from "@/lib/push/register-push-notifications";
import {
  clearStoredPushToken,
  saveStoredPushToken,
} from "@/lib/push/push-token-storage";
import { useAuthUser } from "@/hooks/use-auth-user";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

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

export function PushNotificationsSetup() {
  const { data: user } = useAuthUser();
  const router = useRouter();
  const qc = useQueryClient();
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      const prev = registeredTokenRef.current;
      registeredTokenRef.current = null;
      if (prev) {
        void clearPushTokenFromBackend(prev, unregisterPushToken);
        void clearStoredPushToken();
      }
      return;
    }

    let cancelled = false;

    void (async () => {
      const authToken = await getAuthToken();
      if (!authToken || cancelled) {
        return;
      }
      try {
        const token = await syncPushTokenWithBackend(registerPushToken);
        if (!token || cancelled) {
          return;
        }
        registeredTokenRef.current = token;
        await saveStoredPushToken(token);
      } catch {
        // permissions denied or network error
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const convId = conversationIdFromNotificationData(
          notification.request.content.data,
        );
        if (convId) {
          invalidateChatListQueries(qc);
        }
        if (shouldSuppressChatNotificationBanner(convId)) {
          void Notifications.dismissNotificationAsync(
            notification.request.identifier,
          );
        }
      },
    );

    const responseSub =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const convId = conversationIdFromNotificationData(
          response.notification.request.content.data,
        );
        if (!convId) {
          return;
        }
        router.push(`/chat/${convId}`);
      });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [qc, router]);

  return null;
}
