import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Tour } from "@/lib/types";
import { normalizeItemsPayload, normalizeTourSummary } from "@/lib/api-normalizers";

export function useTours(driverId?: string | null) {
  return useQuery({
    queryKey: ["tours", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const result = await api.get<unknown>(`/api/tours?driverId=${driverId}&limit=20`);
      const items = normalizeItemsPayload<unknown>(result);
      return items.map(normalizeTourSummary).filter((tour): tour is Tour => Boolean(tour));
    },
    enabled: Boolean(driverId),
    staleTime: 5 * 60 * 1000
  });
}
