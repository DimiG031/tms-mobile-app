import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppNotification, Tour } from "@/lib/types";
import { normalizeItemsPayload, normalizeTourSummary } from "@/lib/api-normalizers";

export function useDashboardData(driverId?: string | null) {
  return useQuery({
    queryKey: ["dashboard", driverId],
    queryFn: async () => {
      if (!driverId) {
        return { activeTour: null as Tour | null, upcomingTours: [] as Tour[], unreadNotificationsCount: 0 };
      }

      const today = new Date().toISOString().slice(0, 10);
      const [active, upcoming, notifications] = await Promise.all([
        api.get<unknown>(`/api/tours?driverId=${driverId}&status=IN_TRANSIT&limit=1`),
        api.get<unknown>(`/api/tours?driverId=${driverId}&dateFrom=${today}&limit=5`),
        api.get<unknown>("/api/notifications?limit=5&isRead=0")
      ]);

      const activeItems = normalizeItemsPayload<unknown>(active)
        .map(normalizeTourSummary)
        .filter((tour): tour is Tour => Boolean(tour));
      const upcomingItems = normalizeItemsPayload<unknown>(upcoming)
        .map(normalizeTourSummary)
        .filter((tour): tour is Tour => Boolean(tour));
      const notificationItems = normalizeItemsPayload<AppNotification>(notifications);

      return {
        activeTour: activeItems[0] ?? null,
        upcomingTours: upcomingItems,
        unreadNotificationsCount: notificationItems.filter((n) => !n.isRead).length
      };
    },
    enabled: Boolean(driverId),
    staleTime: 2 * 60 * 1000
  });
}
