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
import { ROUTE_PATH } from "@/constants/routePath";
import { useAuthUser } from "@/hooks/use-auth-user";
import { invalidateNotificationQueries } from "@/hooks/use-notifications";
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

function matchedItemIdFromNotificationData(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const row = data as { type?: unknown; matchedItemId?: unknown };
  if (row.type !== "item_match") {
    return null;
  }
  if (typeof row.matchedItemId !== "string" || !row.matchedItemId) {
    return null;
  }
  return row.matchedItemId;
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
        const data = notification.request.content.data;
        const convId = conversationIdFromNotificationData(data);
        const itemId = matchedItemIdFromNotificationData(data);

        if (convId) {
          invalidateChatListQueries(qc);
        }
        if (itemId) {
          invalidateNotificationQueries(qc);
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
        const data = response.notification.request.content.data;
        const convId = conversationIdFromNotificationData(data);
        if (convId) {
          router.push(`/chat/${convId}`);
          return;
        }
        const itemId = matchedItemIdFromNotificationData(data);
        if (itemId) {
          invalidateNotificationQueries(qc);
          router.push({
            pathname: ROUTE_PATH.ITEM,
            params: { id: itemId },
          });
        }
      });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [qc, router]);

  return null;
}
