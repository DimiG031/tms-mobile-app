import type { CoDriverRole, Tour } from "@/lib/types";

export type CrewRole = "MAIN" | "CO_DRIVER" | "ASSISTANT" | "NONE";

type CrewFields = {
  driverId?: string | null;
  coDriverId?: string | null;
  coDriverRole?: CoDriverRole | null;
};

/**
 * Uloga prijavljenog vozača na turi (ili putnom nalogu).
 *
 * `coDriverId` postavljen a `coDriverRole` prazan → backend to tretira kao
 * DRUGOG VOZAČA (vozi), ne kao suvozača.
 */
export function crewRole(item?: CrewFields | null, myDriverId?: string | null): CrewRole {
  if (!item || !myDriverId) return "NONE";
  if (item.driverId && item.driverId === myDriverId) return "MAIN";
  if (item.coDriverId && item.coDriverId === myDriverId) {
    return item.coDriverRole === "ASSISTANT" ? "ASSISTANT" : "CO_DRIVER";
  }
  return "NONE";
}

export function isCoDriver(role: CrewRole): boolean {
  return role === "CO_DRIVER" || role === "ASSISTANT";
}

/** Kratka oznaka za značku u listi i istoriji. */
export function crewBadgeLabel(role: CrewRole): string | null {
  if (role === "CO_DRIVER") return "Dvojna posada · drugi vozač";
  if (role === "ASSISTANT") return "Dvojna posada · suvozač";
  return null;
}

export function tourCrewRole(tour?: Tour | null, myDriverId?: string | null): CrewRole {
  return crewRole(tour, myDriverId);
}
