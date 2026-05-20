import { getActiveConversationId } from "@/lib/chat/active-conversation";

let chatTabFocused = false;

export function setChatTabFocused(focused: boolean) {
  chatTabFocused = focused;
}

export function isChatTabFocused(): boolean {
  return chatTabFocused;
}

/** Suppress in-app banner when user is already on chat list or viewing that thread. */
export function shouldSuppressChatNotificationBanner(
  conversationId?: string | null,
): boolean {
  if (chatTabFocused) {
    return true;
  }
  const active = getActiveConversationId();
  if (active != null && active === conversationId) {
    return true;
  }
  return false;
}
