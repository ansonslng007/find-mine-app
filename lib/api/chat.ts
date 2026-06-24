import { apiClient } from "./client";
import type { ItemKind } from "./items";

export type ChatPeer = {
  id: string;
  displayName: string | null;
  lastSeenAt?: string | null;
};

export type ChatItemSummary = {
  id: string;
  title: string;
  description?: string | null;
  kind: ItemKind;
  imageUrl: string;
};

export type ConversationListEntry = {
  id: string;
  /** null when the linked listing was deleted */
  item: ChatItemSummary | null;
  peer: ChatPeer;
  lastMessage:
    | {
        type: "text" | "voice";
        body: string | null;
        voiceDurationSec: number | null;
        at: string | null;
      }
    | null;
  unreadCount: number;
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
    item: ChatItemSummary | null;
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
  type: "text" | "voice";
  body: string | null;
  voice: {
    audioUrl: string | null;
    durationSec: number | null;
    mimeType: string | null;
  } | null;
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

export async function deleteConversation(conversationId: string): Promise<void> {
  await apiClient.delete(`/api/v1/conversations/${conversationId}`);
}

export type CreateVoiceUploadUrlResponse = {
  uploadUrl: string;
  audioUrl: string;
  objectName: string;
  expiresAt: string;
  maxDurationSec: number;
};

export async function createVoiceUploadUrl(
  conversationId: string,
  input: { mimeType: string; durationSec: number; fileSize: number },
): Promise<CreateVoiceUploadUrlResponse> {
  const { data } = await apiClient.post<CreateVoiceUploadUrlResponse>(
    `/api/v1/conversations/${conversationId}/voice-upload-url`,
    input,
  );
  return data;
}
