import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppNotification } from "@/lib/types";
import { normalizeItemsPayload, normalizePagedPayload } from "@/lib/api-normalizers";

type NotificationsPage = {
  items: AppNotification[];
  nextCursor: string | null;
  limit: number;
};

export function isChatNotification(notification: AppNotification): boolean {
  return (
    notification.type === "CHAT_MESSAGE" ||
    Boolean(notification.metadata?.threadId) ||
    Boolean(notification.actionUrl?.includes("/chat/"))
  );
}

export function useNotificationsInfinite(limit = 20) {
  return useInfiniteQuery({
    queryKey: ["notifications", "infinite", limit],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const cursorParam = pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : "";
      const result = await api.get<unknown>(`/api/notifications?limit=${limit}${cursorParam}`);
      const page = normalizePagedPayload<AppNotification>(result) as NotificationsPage;
      return {
        ...page,
        items: page.items.filter((item) => !isChatNotification(item))
      };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor || null,
    staleTime: 2 * 60 * 1000
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const fallback = await api.get<unknown>("/api/notifications?limit=100&isRead=0");
      return normalizeItemsPayload<AppNotification>(fallback).filter((item) => !item.isRead && !isChatNotification(item)).length;
    },
    staleTime: 2 * 60 * 1000
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/api/notifications/${id}`, { isRead: true });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post("/api/notifications/mark-all-read");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}
