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

export function getVisibleTabModules(profile?: MobileProfile | null): MobileModuleDefinition[] {
  const modules = getEffectiveSelectedModules(profile)
    .map(getModuleDefinition)
    .filter((module) => module.routeName);

  if (!profile?.preferences.sliceNavigationEnabled || modules.length <= 5) {
    return modules;
  }

  const home = modules.find((module) => module.key === "home") ?? getModuleDefinition("home");
  const profileModule = modules.find((module) => module.key === "profile") ?? getModuleDefinition("profile");
  const more = getModuleDefinition("more");

  return [home, more, profileModule].filter((module) => module.routeName);
}

export function getSliceModules(profile?: MobileProfile | null): MobileModuleDefinition[] {
  return getEffectiveSelectedModules(profile)
    .map(getModuleDefinition)
    .filter((module) => module.routeName && module.key !== "home" && module.key !== "profile" && module.key !== "more");
}
