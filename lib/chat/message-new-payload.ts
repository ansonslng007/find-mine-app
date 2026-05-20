export type MessageNewPayload = Readonly<{
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}>;

export function isMessageNewPayload(value: unknown): value is MessageNewPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.conversationId === "string" &&
    typeof row.senderId === "string" &&
    typeof row.body === "string" &&
    typeof row.createdAt === "string"
  );
}
