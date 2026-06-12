import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TourChecklist } from "@/lib/types";

function normalizeChecklist(payload: unknown, tourId: string): TourChecklist | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as { data?: unknown };
  const data = (root.data ?? payload) as Partial<TourChecklist> | undefined;
  if (!data || !Array.isArray(data.items)) return null;
  return {
    tourId: data.tourId ?? tourId,
    items: data.items,
    completedCount: data.completedCount ?? data.items.filter((item) => item.completed).length,
    requiredRemaining:
      data.requiredRemaining ?? data.items.filter((item) => item.required && !item.completed).length
  };
}

export function useTourChecklist(tourId?: string) {
  return useQuery({
    queryKey: ["tour-checklist", tourId],
    queryFn: async () => {
      if (!tourId) return null;
      const result = await api.get<unknown>(`/api/mobile/tours/${tourId}/checklist`);
      return normalizeChecklist(result, tourId);
    },
    enabled: Boolean(tourId),
    staleTime: 60_000
  });
}

export function useToggleChecklistItem(tourId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { itemId: string; completed: boolean }) => {
      if (!tourId) throw new Error("Missing tour id");
      await api.patchQueued(`/api/mobile/tours/${tourId}/checklist/${params.itemId}`, {
        completed: params.completed
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tour-checklist", tourId] });
    }
  });
}
