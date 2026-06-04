import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppNotification } from "@/lib/types";
import { normalizeItemsPayload, normalizePagedPayload } from "@/lib/api-normalizers";
import { useAuth } from "@/providers/AuthProvider";

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

export function useNotificationsInfinite(limit = 20, driverId?: string | null) {
  return useInfiniteQuery({
    queryKey: ["notifications", "infinite", limit, driverId],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const cursorParam = pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : "";
      const driverParam = driverId ? `&driverId=${encodeURIComponent(driverId)}` : "";
      const result = await api.get<unknown>(`/api/notifications?limit=${limit}${cursorParam}${driverParam}`);
      const page = normalizePagedPayload<AppNotification>(result) as NotificationsPage;
      return {
        ...page,
        items: page.items.filter((item) => !isChatNotification(item))
      };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor || null,
    staleTime: 2 * 60 * 1000,
    enabled: driverId !== undefined ? Boolean(driverId) : true
  });
}

export function useUnreadNotificationsCount(driverId?: string | null) {
  return useQuery({
    queryKey: ["notifications", "unread-count", driverId],
    queryFn: async () => {
      const driverParam = driverId ? `&driverId=${encodeURIComponent(driverId)}` : "";
      const fallback = await api.get<unknown>(`/api/notifications?limit=100&isRead=0${driverParam}`);
      return normalizeItemsPayload<AppNotification>(fallback).filter((item) => !item.isRead && !isChatNotification(item)).length;
    },
    staleTime: 2 * 60 * 1000,
    enabled: driverId !== undefined ? Boolean(driverId) : true
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
  const { session } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const driverParam = session?.user.driverId
        ? `&driverId=${encodeURIComponent(session.user.driverId)}`
        : "";
      let cursor: string | null = null;

      do {
        const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
        const result = await api.get<unknown>(`/api/notifications?limit=50&isRead=0${driverParam}${cursorParam}`);
        const page = normalizePagedPayload<AppNotification>(result) as NotificationsPage;
        const ids = page.items
          .filter((item) => !item.isRead && !isChatNotification(item))
          .map((item) => item.id);

        await Promise.all(ids.map((id) => api.patch(`/api/notifications/${id}`, { isRead: true })));
        cursor = page.nextCursor;
      } while (cursor);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}
