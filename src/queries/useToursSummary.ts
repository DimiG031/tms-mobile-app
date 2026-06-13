import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ToursSummaryBucket = {
  label?: string;
  tours: number;
  km: number;
  completed: number;
  activeTours: number;
};

export type ToursSummary = {
  week: ToursSummaryBucket;
  month: ToursSummaryBucket;
  year: ToursSummaryBucket;
  total: ToursSummaryBucket;
};

function normalizeBucket(value: unknown): ToursSummaryBucket {
  const obj = (value ?? {}) as Record<string, unknown>;
  const num = (input: unknown) => (typeof input === "number" && Number.isFinite(input) ? input : 0);
  return {
    label: typeof obj.label === "string" ? obj.label : undefined,
    tours: num(obj.tours),
    km: num(obj.km),
    completed: num(obj.completed),
    activeTours: num(obj.activeTours)
  };
}

export function useToursSummary() {
  return useQuery({
    queryKey: ["tours-summary"],
    queryFn: async () => {
      const result = await api.get<{ ok?: boolean; data?: unknown }>("/api/mobile/tours/summary");
      const data = (result.data ?? {}) as { week?: unknown; month?: unknown; year?: unknown; total?: unknown };
      return {
        week: normalizeBucket(data.week),
        month: normalizeBucket(data.month),
        year: normalizeBucket(data.year),
        total: normalizeBucket(data.total)
      } satisfies ToursSummary;
    },
    staleTime: 5 * 60 * 1000
  });
}
