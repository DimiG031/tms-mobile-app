import type { CoDriverRole, Tour } from "@/lib/types";

export type CrewRole = "MAIN" | "CO_DRIVER" | "ASSISTANT" | "NONE";

type CrewFields = {
  driverId?: string | null;
  coDriverId?: string | null;
  coDriverRole?: CoDriverRole | null;
  activeDriverId?: string | null;
};

/**
 * Formalna uloga na turi (ili putnom nalogu) — ko je nosilac, a ko drugi član.
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

/** Ko trenutno vozi. `activeDriverId` prazan → aktivan je glavni vozač. */
export function activeDriverIdOf(item?: CrewFields | null): string | null {
  if (!item) return null;
  return item.activeDriverId ?? item.driverId ?? null;
}

/**
 * Sme li prijavljeni vozač da piše (stanice, troškovnik, checklist, putni list).
 *
 * Od 2026-10-22 dozvole prate AKTIVNOG vozača, ne formalnog nosioca — drugi
 * vozač posle „Smene vožnje" ima pune dozvole.
 *
 * Kad podatak nedostaje (stariji odgovor ili keširan zapis bez ovih polja)
 * NAMERNO vraćamo `true`: bolje pustiti pa da backend odbije, nego zaključati
 * vozaču njegovu sopstvenu turu zbog polja koje nije stiglo.
 */
export function canWriteAsCrew(item?: CrewFields | null, myDriverId?: string | null): boolean {
  if (!item || !myDriverId) return true;
  const active = activeDriverIdOf(item);
  if (!active) return true;
  return active === myDriverId;
}

/** Dvojna posada u kojoj se smena uopšte može menjati (suvozač ne vozi). */
export function canSwitchDriver(item?: CrewFields | null): boolean {
  if (!item?.coDriverId) return false;
  return item.coDriverRole !== "ASSISTANT";
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
