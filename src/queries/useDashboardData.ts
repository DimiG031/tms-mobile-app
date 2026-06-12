import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppNotification, Tour } from "@/lib/types";
import { normalizeItemsPayload, normalizeTourSummary } from "@/lib/api-normalizers";
import { isChatNotification } from "@/queries/useNotifications";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateLabelRange(value?: string | null): { start: Date | null; end: Date | null } {
  if (!value) return { start: null, end: null };
  const parts = value.split(" - ").map((part) => part.trim()).filter(Boolean);
  return {
    start: parseDate(parts[0]),
    end: parseDate(parts[1])
  };
}

function countTourDays(start: Date | null, end: Date | null): number {
  if (!start) return 0;
  const safeEnd = end ?? new Date();
  const diff = safeEnd.getTime() - start.getTime();
  if (diff < 0) return 1;
  return Math.max(1, Math.ceil(diff / 86_400_000));
}

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [toursRaw, notifications] = await Promise.all([
        api.get<unknown>("/api/tours?limit=30"),
        api.get<unknown>("/api/notifications?limit=5&isRead=0")
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
      const completedTours = allTours.filter((t) => t.status === "COMPLETED");
      const activeRange = activeTour
        ? {
            start: parseDate(activeTour.startDate) ?? parseDateLabelRange(activeTour.dateLabel).start,
            end: parseDate(activeTour.endDate) ?? parseDateLabelRange(activeTour.dateLabel).end
          }
        : { start: null, end: null };
      const completedDays = completedTours.reduce((sum, tour) => {
        const range = {
          start: parseDate(tour.startDate) ?? parseDateLabelRange(tour.dateLabel).start,
          end: parseDate(tour.endDate) ?? parseDateLabelRange(tour.dateLabel).end
        };
        return sum + countTourDays(range.start, range.end);
      }, 0);
      const totalDistanceKm = allTours.reduce((sum, tour) => sum + (tour.distanceKm ?? 0), 0);

      return {
        activeTour,
        upcomingTours,
        unreadNotificationsCount: notificationItems.filter((n) => !n.isRead && !isChatNotification(n)).length,
        stats: {
          totalTours: allTours.length,
          completedTours: completedTours.length,
          plannedTours: allTours.filter((t) => t.status === "PLANNED").length,
          activeTourDays: activeTour ? countTourDays(activeRange.start, activeRange.end) : 0,
          completedTourDays: completedDays,
          totalDistanceKm: totalDistanceKm > 0 ? totalDistanceKm : null
        }
      };
    },
    staleTime: 2 * 60 * 1000
  });
}
