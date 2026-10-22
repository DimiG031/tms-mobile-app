import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TourStop } from "@/lib/types";
import { normalizePagedPayload, normalizeTourStop } from "@/lib/api-normalizers";

export type RouteStopAction = "ARRIVED" | "DEPARTED" | "CANCELED" | "NOTE";

export type RouteStopActionInput = {
  stopId: string;
  action: RouteStopAction;
  timestamp?: string;
  latitude?: number | null;
  longitude?: number | null;
  note?: string | null;
};

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

// Vozac sa lica mesta (rampa, ulaz u firmu) snima tacne koordinate stanice.
// Backend odmah upisuje koordinate na stanicu; sa katalogom firme postupa
// opreznije — ako lokacija vec ima pin, salje ga dispeceru kao predlog.
export type StopCoordsResult = { location: "none" | "accepted" | "proposed" | string };

// "queued" = nismo bili na mrezi, zahtev ceka u offline redu, pa odgovor (a
// time ni to da li je lokacija prihvacena ili predlozena) jos ne znamo.
export type StopCoordsOutcome = "none" | "accepted" | "proposed" | "queued";

export function useSaveStopCoords(tourId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { stopId: string; latitude: number; longitude: number }) => {
      const res = await api.postQueued<{ ok: boolean; data?: StopCoordsResult }>(
        `/api/mobile/route-stops/${encodeURIComponent(params.stopId)}/coords`,
        { latitude: params.latitude, longitude: params.longitude }
      );
      if (res.queued) return "queued" as StopCoordsOutcome;
      return (res.data?.data?.location ?? "none") as StopCoordsOutcome;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tour-stops", tourId] });
      await queryClient.invalidateQueries({ queryKey: ["tour-details", tourId] });
    }
  });
}

export function useRouteStopAction(tourId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stopId, action, timestamp, latitude, longitude, note }: RouteStopActionInput) => {
      await api.postQueued(`/api/mobile/route-stops/${encodeURIComponent(stopId)}/actions`, {
        action,
        timestamp: timestamp ?? new Date().toISOString(),
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        note: note?.trim() || null
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tour-stops", tourId] });
      await queryClient.invalidateQueries({ queryKey: ["tour-details", tourId] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}
