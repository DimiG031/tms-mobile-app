import { changeTourStatus } from "@/lib/tourStatusChange";
import { readSession, getSessionRevision, assertSessionRevision } from "@/lib/secure-store";
import { offlineOwner } from "@/lib/offline-owner";
import { config } from "@/lib/config";
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
      const revision = getSessionRevision();
      const owner = offlineOwner(await readSession(), config.apiUrl);
      assertSessionRevision(revision);
      if (!owner) throw new Error("Za promenu statusa potrebna je prijava.");
      return changeTourStatus({ ...params, tourId: tourId ?? "" }, {
        assertCurrent: () => assertSessionRevision(revision),
        patch: () => api.patch(`/api/tours/${tourId}`, { status: params.status }),
        start: () => startGpsTracking({ tourId: tourId!, vehicleId: params.vehicleId! }, revision),
        stop: () => stopGpsTracking(owner),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tour-details", tourId] });
      await queryClient.invalidateQueries({ queryKey: ["tours"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}

/** Retry only the native GPS operation; never resend an already saved status. */
export function useTourGps(tourId?: string) {
  return useMutation({ mutationFn: async (params: { stop: boolean; vehicleId?: string | null }) => {
    const revision = getSessionRevision();
    const owner = offlineOwner(await readSession(), config.apiUrl);
    assertSessionRevision(revision);
    if (!owner || !tourId) throw new Error("Nedostaje prijava ili tura.");
    if (params.stop) await stopGpsTracking(owner);
    else {
      if (!params.vehicleId) throw new Error("Turi nije dodeljeno vozilo.");
      await startGpsTracking({ tourId, vehicleId: params.vehicleId }, revision);
    }
    assertSessionRevision(revision);
  } });
}
