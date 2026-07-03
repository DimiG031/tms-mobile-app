import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { MobileModuleKey, MobileProfile } from "@/lib/types";

export type MobileModuleDefinition = {
  key: MobileModuleKey;
  label: string;
  description: string;
  routeName: string | null;
  icon: ComponentProps<typeof Ionicons>["name"];
  fixed?: boolean;
};

export const MOBILE_MODULES: MobileModuleDefinition[] = [
  {
    key: "home",
    label: "Početna",
    description: "Pregled aktivne ture, poruka i obaveštenja.",
    routeName: "index",
    icon: "home-outline",
    fixed: true
  },
  {
    key: "tours",
    label: "Ture",
    description: "Lista i detalji tura.",
    routeName: "tours",
    icon: "trail-sign-outline"
  },
  {
    key: "chat",
    label: "Poruke",
    description: "Razgovori i poruke.",
    routeName: "chat",
    icon: "chatbubble-ellipses-outline"
  },
  {
    key: "notifications",
    label: "Obaveštenja",
    description: "Operativna obaveštenja bez chat poruka.",
    routeName: "notifications",
    icon: "notifications-outline"
  },
  {
    key: "documents",
    label: "Dokumenta",
    description: "Dokumenta dostupna mobilnom korisniku.",
    routeName: "documents",
    icon: "document-text-outline"
  },
  {
    key: "rokovnik",
    label: "Rokovnik",
    description: "Lični podsetnici i zadaci po datumu.",
    routeName: "rokovnik",
    icon: "calendar-outline"
  },
  {
    key: "putni-nalog",
    label: "Putni nalog",
    description: "Beleženje događaja sa puta i vraćanje naloga.",
    routeName: "putni-nalog",
    icon: "clipboard-outline"
  },
  {
    key: "mapa-mesta",
    label: "Mapa mesta",
    description: "Parkinzi, pumpe i mesta za pauzu sa terena.",
    routeName: "mapa-mesta",
    icon: "location-outline"
  },
  {
    key: "more",
    label: "Više",
    description: "Brz izbor dodatnih modula.",
    routeName: "more",
    icon: "apps-outline"
  },
  {
    key: "profile",
    label: "Profil",
    description: "Profil i podešavanja.",
    routeName: "profile",
    icon: "person-outline",
    fixed: true
  }
];

const FALLBACK_ORDER: MobileModuleKey[] = ["home", "tours", "chat", "notifications", "profile"];

// Moduli koje mobile uvek prikazuje u „Više" krugu radi zajamčene dostupnosti.
// Backend ih od 2026-07-02 uključuje u availableMobileModules (pa se pojavljuju
// i u biraču modula i mogu se slati kroz preferences), ali ih ovde i dalje
// „pinujemo" u „Više" da budu dostupni i kad ih vozač ne izabere kao karticu,
// i kao rezerva dok se profil ne deploy-uje.
const CLIENT_ONLY_SLICE_MODULES: MobileModuleKey[] = ["rokovnik", "putni-nalog", "mapa-mesta"];

export function getModuleDefinition(key: MobileModuleKey): MobileModuleDefinition {
  return MOBILE_MODULES.find((module) => module.key === key) ?? {
    key,
    label: key,
    description: "Modul još nema mobilni ekran.",
    routeName: null,
    icon: "apps-outline"
  };
}

export function sortModulesByPreference(keys: MobileModuleKey[], order: MobileModuleKey[]): MobileModuleKey[] {
  const orderIndex = new Map(order.map((key, index) => [key, index]));
  return [...keys].sort((a, b) => {
    const aIndex = orderIndex.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = orderIndex.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.localeCompare(b);
  });
}

export function getEffectiveSelectedModules(profile?: MobileProfile | null): MobileModuleKey[] {
  if (!profile) return FALLBACK_ORDER;

  const available = new Set(profile.availableMobileModules);
  const selected = profile.preferences.selectedModules.filter((key) => available.has(key));
  const withFixed = new Set<MobileModuleKey>(selected);

  for (const module of MOBILE_MODULES) {
    if (module.fixed && available.has(module.key)) {
      withFixed.add(module.key);
    }
  }

  const normalized = Array.from(withFixed);
  return sortModulesByPreference(normalized, profile.preferences.moduleOrder);
}

export function getVisibleTabModules(_profile?: MobileProfile | null): MobileModuleDefinition[] {
  // Donja navigacija je uvek: Početna · Više · Profil. „Više" (točak) je uvek
  // prisutan i sadrži sve ostale module; koji su moduli u točku bira se u
  // Podešavanja > Navigacija (izbor modula). Početna i Profil su fiksni.
  return [getModuleDefinition("home"), getModuleDefinition("more"), getModuleDefinition("profile")].filter(
    (module) => module.routeName
  );
}

export function getSliceModules(profile?: MobileProfile | null): MobileModuleDefinition[] {
  const modules = getEffectiveSelectedModules(profile)
    .map(getModuleDefinition)
    .filter((module) => module.routeName && module.key !== "home" && module.key !== "profile" && module.key !== "more");

  // Uvek dodaj klijentske module (npr. Rokovnik) u „Više" krug, bez slanja
  // kroz preferences (backend ih još ne zna).
  for (const key of CLIENT_ONLY_SLICE_MODULES) {
    if (!modules.some((module) => module.key === key)) {
      const def = getModuleDefinition(key);
      if (def.routeName) modules.push(def);
    }
  }

  return modules;
}
