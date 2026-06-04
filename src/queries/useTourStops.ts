import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TourStop } from "@/lib/types";
import { normalizePagedPayload, normalizeTourStop } from "@/lib/api-normalizers";

export function useTourStops(tourId?: string) {
  return useQuery({
    queryKey: ["tour-stops", tourId],
    queryFn: async () => {
      if (!tourId) return [];
      const result = await api.get<unknown>(`/api/route-stops?tourId=${encodeURIComponent(tourId)}&limit=200`);
      return normalizePagedPayload<unknown>(result).items
        .map((item, index) => normalizeTourStop(item, index + 1))
        .filter((item): item is TourStop => Boolean(item));
    },
    enabled: Boolean(tourId),
    staleTime: 5 * 60 * 1000
  });
}
