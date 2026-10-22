import { useAuth } from "@/providers/AuthProvider";
import { useMobileProfile } from "@/queries/useMobileProfile";
import { crewRole, type CrewRole } from "@/lib/crew";
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
