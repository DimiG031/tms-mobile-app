import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TourDetails } from "@/lib/types";
import { startGpsTracking, stopGpsTracking } from "@/services/gpsTracking";
import { normalizeTourDetailsPayload } from "@/lib/api-normalizers";

function normalizeTourDetails(payload: unknown): TourDetails | null {
  return normalizeTourDetailsPayload(payload);
}

export function useTourDetails(tourId?: string) {
  return useQuery({
    queryKey: ["tour-details", tourId],
    queryFn: async () => {
      if (!tourId) return null;
      const result = await api.get<unknown>(`/api/tours/${tourId}`);
      return normalizeTourDetails(result);
    },
    enabled: Boolean(tourId),
    staleTime: 5 * 60 * 1000
  });
}

export function useUpdateTourStatus(tourId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { status: string; vehicleId?: string | null }) => {
      if (!tourId) throw new Error("Missing tour id");
      await api.patch(`/api/tours/${tourId}`, { status: params.status });

      if (params.status === "IN_TRANSIT") {
        if (!params.vehicleId) {
          throw new Error("Missing vehicle id. Cannot start GPS tracking.");
        }
        await startGpsTracking({ tourId, vehicleId: params.vehicleId });
      }

      if (params.status === "COMPLETED") {
        await stopGpsTracking();
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tour-details", tourId] });
      await queryClient.invalidateQueries({ queryKey: ["tours"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}
