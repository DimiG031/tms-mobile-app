import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppNotification, Tour } from "@/lib/types";
import { normalizeItemsPayload, normalizeTourSummary } from "@/lib/api-normalizers";
import { isChatNotification } from "@/queries/useNotifications";

export function useDashboardData(driverId?: string | null) {
  return useQuery({
    queryKey: ["dashboard", driverId],
    queryFn: async () => {
      if (!driverId) {
        return { activeTour: null as Tour | null, upcomingTours: [] as Tour[], unreadNotificationsCount: 0 };
      }

      const [toursRaw, notifications] = await Promise.all([
        api.get<unknown>(`/api/tours?driverId=${driverId}&limit=30`),
        api.get<unknown>(`/api/notifications?limit=5&isRead=0&driverId=${driverId}`)
      ]);

      const allTours = normalizeItemsPayload<unknown>(toursRaw)
        .map(normalizeTourSummary)
        .filter((tour): tour is Tour => Boolean(tour));

      const activeTour =
        allTours.find((t) => t.status === "IN_TRANSIT") ??
        allTours.find((t) => t.status === "CONFIRMED") ??
        null;

      const upcomingTours = allTours
        .filter((t) => t.status === "PLANNED")
        .slice(0, 5);

      const notificationItems = normalizeItemsPayload<AppNotification>(notifications);

      return {
        activeTour,
        upcomingTours,
        unreadNotificationsCount: notificationItems.filter((n) => !n.isRead && !isChatNotification(n)).length
      };
    },
    enabled: Boolean(driverId),
    staleTime: 2 * 60 * 1000
  });
}
