import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  deleteNotification,
  clearAllNotifications,
} from "@/actions/notifications";

interface Notification {
  id: number;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean | null;
  createdAt: Date | null;
  userId: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllAsRead,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const prev = qc.getQueryData<Notification[]>(["notifications"]);
      if (prev) {
        qc.setQueryData(
          ["notifications"],
          prev.map((n) => ({ ...n, isRead: true }))
        );
      }
      qc.setQueryData(["unread-count"], { count: 0 });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(["notifications"], context.prev);
      }
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteNotification(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const prev = qc.getQueryData<Notification[]>(["notifications"]);
      if (prev) {
        qc.setQueryData(
          ["notifications"],
          prev.filter((n) => n.id !== id)
        );
      }
      // Optimistically update unread count
      const prevCount = qc.getQueryData<{ count: number }>(["unread-count"]);
      const wasUnread = prev?.find((n) => n.id === id && !n.isRead);
      if (prevCount && wasUnread) {
        qc.setQueryData(["unread-count"], { count: Math.max(0, prevCount.count - 1) });
      }
      return { prev, prevCount };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        qc.setQueryData(["notifications"], context.prev);
      }
      if (context?.prevCount) {
        qc.setQueryData(["unread-count"], context.prevCount);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}

export function useClearAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clearAllNotifications,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const prev = qc.getQueryData<Notification[]>(["notifications"]);
      qc.setQueryData(["notifications"], []);
      qc.setQueryData(["unread-count"], { count: 0 });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(["notifications"], context.prev);
      }
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}
