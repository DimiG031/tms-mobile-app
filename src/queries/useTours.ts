import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Tour } from "@/lib/types";
import { normalizeItemsPayload, normalizeTourSummary } from "@/lib/api-normalizers";

export function useTours() {
  return useQuery({
    queryKey: ["tours"],
    queryFn: async () => {
      const result = await api.get<unknown>("/api/tours?limit=20");
      const items = normalizeItemsPayload<unknown>(result);
      return items.map(normalizeTourSummary).filter((tour): tour is Tour => Boolean(tour));
    },
    staleTime: 5 * 60 * 1000
  });
}
