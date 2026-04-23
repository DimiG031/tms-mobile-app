import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppNotification } from "@/lib/types";
import { normalizeItemsPayload, normalizePagedPayload } from "@/lib/api-normalizers";

type NotificationsPage = {
  items: AppNotification[];
  nextCursor: string | null;
  limit: number;
};

function normalizeUnreadCount(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0;
  const root = payload as { data?: unknown };
  if (!root.data || typeof root.data !== "object") return 0;
  const data = root.data as { unreadCount?: unknown; count?: unknown };
  if (typeof data.unreadCount === "number") return data.unreadCount;
  if (typeof data.count === "number") return data.count;
  return 0;
}

export function useNotificationsInfinite(limit = 20) {
  return useInfiniteQuery({
    queryKey: ["notifications", "infinite", limit],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const cursorParam = pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : "";
      const result = await api.get<unknown>(`/api/notifications?limit=${limit}${cursorParam}`);
      return normalizePagedPayload<AppNotification>(result) as NotificationsPage;
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
      try {
        const result = await api.get<unknown>("/api/notifications/unread-count");
        return normalizeUnreadCount(result);
      } catch {
        const fallback = await api.get<unknown>("/api/notifications?limit=50&isRead=0");
        return normalizeItemsPayload<AppNotification>(fallback).filter((item) => !item.isRead).length;
      }
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
