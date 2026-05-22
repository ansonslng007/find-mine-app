import { apiClient } from "./client";

export type ItemMatchNotificationRole = "source" | "matched";

export type ItemMatchNotification = Readonly<{
  id: string;
  role: ItemMatchNotificationRole;
  sourceItemId: string;
  matchedItemId: string;
  createdAt: string;
  readAt: string | null;
  targetItem: Readonly<{
    id: string;
    title: string;
    kind: "lost" | "found";
    imageUrl: string;
  }>;
}>;

export async function listNotifications(
  limit = 50,
): Promise<{ notifications: ItemMatchNotification[] }> {
  const { data } = await apiClient.get<{ notifications: ItemMatchNotification[] }>(
    "/api/v1/notifications",
    { params: { limit } },
  );
  return data;
}

export async function getUnreadNotificationCount(): Promise<{ count: number }> {
  const { data } = await apiClient.get<{ count: number }>(
    "/api/v1/notifications/unread-count",
  );
  return data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch("/api/v1/notifications/read-all");
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/api/v1/notifications/${id}/read`);
}
