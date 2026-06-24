export type MessageNewPayload = Readonly<{
  id: string;
  conversationId: string;
  senderId: string;
  type: "text" | "voice";
  body: string | null;
  voice:
    | {
        audioUrl: string;
        durationSec: number;
        mimeType: string;
      }
    | null;
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
    (row.type === "text" || row.type === "voice") &&
    (typeof row.body === "string" || row.body === null) &&
    (row.voice === null ||
      (typeof row.voice === "object" &&
        typeof (row.voice as Record<string, unknown>).audioUrl === "string" &&
        typeof (row.voice as Record<string, unknown>).durationSec === "number" &&
        typeof (row.voice as Record<string, unknown>).mimeType === "string")) &&
    typeof row.createdAt === "string"
  );
}
