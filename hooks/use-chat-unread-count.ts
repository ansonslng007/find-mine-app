import { useAuthUser } from "@/hooks/use-auth-user";
import { getChatUnreadCount } from "@/lib/api/chat";
import { useQuery } from "@tanstack/react-query";

export const CHAT_UNREAD_COUNT_QUERY_KEY = ["chat-unread-count"] as const;

export function useChatUnreadCount() {
  const { data: user } = useAuthUser();
  return useQuery({
    queryKey: CHAT_UNREAD_COUNT_QUERY_KEY,
    queryFn: getChatUnreadCount,
    enabled: Boolean(user),
    staleTime: 15_000,
    refetchInterval: user === undefined || user === null ? false : 30_000,
  });
}
