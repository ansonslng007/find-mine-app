import { apiClient } from "./client";
import type { ItemKind } from "./items";

export type ChatPeer = {
  id: string;
  displayName: string | null;
};

export type ChatItemSummary = {
  id: string;
  title: string;
  kind: ItemKind;
  imageUrl: string;
};

export type ConversationListEntry = {
  id: string;
  item: ChatItemSummary;
  peer: ChatPeer;
  lastMessage: { body: string; at: string | null } | null;
};

export type ListConversationsResponse = {
  conversations: ConversationListEntry[];
};

export async function listConversations(): Promise<ListConversationsResponse> {
  const { data } = await apiClient.get<ListConversationsResponse>(
    "/api/v1/conversations",
  );
  return data;
}

export type CreateConversationResponse = {
  conversation: { id: string };
};

export async function createConversation(input: {
  peerUserId: string;
  itemId: string;
}): Promise<CreateConversationResponse> {
  const { data } = await apiClient.post<CreateConversationResponse>(
    "/api/v1/conversations",
    {
      peerUserId: input.peerUserId,
      itemId: input.itemId,
    },
  );
  return data;
}

export type ConversationDetailResponse = {
  conversation: {
    id: string;
    item: ChatItemSummary;
    peer: ChatPeer;
  };
};

export async function getConversation(
  conversationId: string,
): Promise<ConversationDetailResponse> {
  const { data } = await apiClient.get<ConversationDetailResponse>(
    `/api/v1/conversations/${conversationId}`,
  );
  return data;
}

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type ListMessagesResponse = {
  messages: ChatMessage[];
};

export async function listMessages(
  conversationId: string,
  params?: { limit?: number; before?: string },
): Promise<ListMessagesResponse> {
  const { data } = await apiClient.get<ListMessagesResponse>(
    `/api/v1/conversations/${conversationId}/messages`,
    {
      params: {
        limit: params?.limit,
        before: params?.before,
      },
    },
  );
  return data;
}

export type ChatUnreadCountResponse = {
  count: number;
};

export async function getChatUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<ChatUnreadCountResponse>(
    "/api/v1/conversations/unread-count",
  );
  return typeof data.count === "number" && Number.isFinite(data.count)
    ? data.count
    : 0;
}

export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  await apiClient.post(`/api/v1/conversations/${conversationId}/read`);
}
