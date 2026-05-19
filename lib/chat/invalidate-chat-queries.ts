import { CHAT_UNREAD_COUNT_QUERY_KEY } from "@/hooks/use-chat-unread-count";
import type { QueryClient } from "@tanstack/react-query";

export function invalidateChatListQueries(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: ["conversations"] });
  void qc.invalidateQueries({ queryKey: CHAT_UNREAD_COUNT_QUERY_KEY });
}
