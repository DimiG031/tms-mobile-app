import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { useMobileProfile } from "@/queries/useMobileProfile";
import {
  activeDriverIdOf,
  canSwitchDriver,
  canWriteAsCrew,
  crewRole,
  type CrewRole
} from "@/lib/crew";
import type { Tour } from "@/lib/types";

/**
 * Moj `driverId`. Profil je izvor istine; sesija je rezerva dok se profil ne
 * učita, pa uloga ne „treperi" pri otvaranju ekrana.
 */
export function useMyDriverId(): string | null {
  const { session } = useAuth();
  const profileQuery = useMobileProfile(Boolean(session));
  return profileQuery.data?.user.driverId ?? session?.user.driverId ?? null;
}

export function useTourCrewRole(tour?: Tour | null): CrewRole {
  const myDriverId = useMyDriverId();
  return crewRole(tour, myDriverId);
}

export type TourAccess = {
  role: CrewRole;
  /** Pune akcije: stanice, troškovnik, checklist, putni list, prijava problema. */
  canWrite: boolean;
  /** Dvojna posada u kojoj „Smena vožnje" ima smisla (suvozač ne vozi). */
  canSwitch: boolean;
  /** Ime vozača koji je trenutno za volanom, kad to nisam ja. */
  activeDriverName: string | null;
};

export function useTourAccess(tour?: Tour | null): TourAccess {
  const myDriverId = useMyDriverId();
  const role = crewRole(tour, myDriverId);
  const canWrite = canWriteAsCrew(tour, myDriverId);

  // Ime znamo samo za drugog člana posade — backend šalje `coDriverName`.
  const activeId = activeDriverIdOf(tour);
  const activeDriverName =
    !canWrite && activeId && tour?.coDriverId === activeId ? tour?.coDriverName ?? null : null;

  return { role, canWrite, canSwitch: canSwitchDriver(tour), activeDriverName };
}

/**
 * Smena vožnje na PUTNOM NALOGU.
 *
 * Putni nalog ne mora da bude vezan za turu (odluka vlasnika 2026-10-23), pa
 * swap mora da postoji i na nivou naloga. Backend ovaj endpoint JOŠ NEMA —
 * zatraženo u docs/forcodexagent/todo.md. Dok ne stigne, dugme se na nalogu
 * bez `tourId` ne prikazuje, da vozač ne dobije 404.
 */
export function useSwitchTravelOrderDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) =>
      api.post<{ ok: boolean; data: { activeDriverId: string | null; isMeActive: boolean } }>(
        `/api/mobile/travel-orders/${orderId}/switch-driver`,
        {}
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["travel-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["travel-order-lines"] })
      ]);
    }
  });
}

/** „Smena vožnje" — swap aktivnog vozača. Sme ga pozvati bilo koji član posade. */
export function useSwitchDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tourId: string) =>
      api.post<{ ok: boolean; data: { activeDriverId: string | null; isMeActive: boolean } }>(
        `/api/mobile/tours/${tourId}/switch-driver`,
        {}
      ),
    onSuccess: async () => {
      // Smena menja dozvole na svim ekranima ture, pa osvežavamo sve što ih čita.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tours"] }),
        queryClient.invalidateQueries({ queryKey: ["tour-details"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["travel-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["travel-order-lines"] })
      ]);
    }
  });
}
