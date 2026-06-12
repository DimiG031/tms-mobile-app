import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Tour } from "@/lib/types";
import { normalizePagedPayload, normalizeTourSummary } from "@/lib/api-normalizers";

export type ToursHistoryFilter = {
  status?: string | null;
  q?: string | null;
};

type HistoryPage = {
  items: Tour[];
  nextCursor: string | null;
  limit: number;
};

export function useToursHistory(filter: ToursHistoryFilter = {}, limit = 20) {
  const status = filter.status?.trim() || null;
  const q = filter.q?.trim() || null;

  return useInfiniteQuery({
    queryKey: ["tours-history", status, q],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      if (pageParam) params.set("cursor", pageParam);

      const result = await api.get<unknown>(`/api/tours?${params.toString()}`);
      const page = normalizePagedPayload<unknown>(result);
      const items = page.items
        .map(normalizeTourSummary)
        .filter((tour): tour is Tour => Boolean(tour));
      return { items, nextCursor: page.nextCursor, limit: page.limit } satisfies HistoryPage;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor || null,
    staleTime: 2 * 60 * 1000
  });
}
