export type AccentTheme = "teal" | "blue" | "indigo";

type AccentPalette = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  badgeBg: string;
  badgeText: string;
};

const ACCENTS: Record<AccentTheme, AccentPalette> = {
  teal: {
    primary: "#0d7d72",
    primaryDark: "#085e55",
    primaryLight: "#e0f2f0",
    primarySoft: "#d8efea",
    badgeBg: "#fef3c7",
    badgeText: "#92400e"
  },
  blue: {
    primary: "#1f5fa8",
    primaryDark: "#184a84",
    primaryLight: "#e7f0ff",
    primarySoft: "#dbeafe",
    badgeBg: "#fef3c7",
    badgeText: "#92400e"
  },
  indigo: {
    primary: "#4b3ca7",
    primaryDark: "#3c3085",
    primaryLight: "#ede9fe",
    primarySoft: "#ddd6fe",
    badgeBg: "#fef3c7",
    badgeText: "#92400e"
  }
};

export const ACTIVE_ACCENT: AccentTheme = "teal";
export const Theme = {
  accent: ACCENTS[ACTIVE_ACCENT],
  text: {
    primary: "#0f172a",
    secondary: "#64748b",
    muted: "#94a3b8",
    inverse: "#ffffff"
  },
  surface: {
    app: "#f1f5f9",
    card: "#ffffff",
    subtle: "#f8fafc",
    border: "#e2e8f0"
  },
  status: {
    PLANNED: { bg: "#dbeafe", text: "#1d4ed8", label: "Planirana" },
    CONFIRMED: { bg: "#d1fae5", text: "#065f46", label: "Potvrdjena" },
    IN_TRANSIT: { bg: "#fef3c7", text: "#92400e", label: "U tranzitu" },
    COMPLETED: { bg: "#dcfce7", text: "#15803d", label: "Zavrsena" },
    CANCELLED: { bg: "#fee2e2", text: "#b91c1c", label: "Otkazana" }
  }
} as const;

export const LightTokens = {
  bgApp: Theme.surface.app,
  bgSurface: Theme.surface.card,
  bgSubtle: Theme.surface.subtle,
  border: Theme.surface.border,
  textPrimary: Theme.text.primary,
  textSecondary: Theme.text.secondary,
  textMuted: Theme.text.muted,
  textInverse: Theme.text.inverse,
  accent: Theme.accent.primary,
  accentDark: Theme.accent.primaryDark,
  accentLight: Theme.accent.primaryLight,
  accentSoft: Theme.accent.primarySoft,
  badgeBg: Theme.accent.badgeBg,
  badgeText: Theme.accent.badgeText,
  glassBg: "rgba(255,255,255,0.58)",
  glassBorder: "rgba(255,255,255,0.55)",
  glassBgAndroid: "rgba(255,255,255,0.9)"
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999
} as const;

export const Shadows = {
  card: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2
  },
  glass: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1
  }
} as const;

export function formatSrDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
    .format(date)
    .replace(",", ".");
}
