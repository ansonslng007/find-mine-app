import {
  getUnreadNotificationCount,
  listNotifications,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationQueryKeys.all, "list"] as const,
  unreadCount: () => [...notificationQueryKeys.all, "unread-count"] as const,
};

export function useNotificationsList(enabled = true) {
  const { data: user } = useAuthUser();
  return useQuery({
    queryKey: notificationQueryKeys.list(),
    queryFn: () => listNotifications(),
    enabled: enabled && Boolean(user),
  });
}

export function useUnreadNotificationCount() {
  const { data: user } = useAuthUser();
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: () => getUnreadNotificationCount(),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
}

export function invalidateNotificationQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: notificationQueryKeys.all });
}
