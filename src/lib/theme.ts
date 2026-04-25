import { Platform, useColorScheme } from "react-native";

// ─── Raw color palette ────────────────────────────────────────
export const Palette = {
  teal50:  "#e0f2f0",
  teal100: "#b3e0db",
  teal400: "#26a69a",
  teal600: "#0d7d72",
  teal700: "#085e55",
  teal900: "#03302b",

  slate50:  "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate700: "#334155",
  slate800: "#1e293b",
  slate900: "#0f172a",

  white:       "#ffffff",
  black:       "#000000",
  transparent: "transparent",

  red50:    "#fff1f2",
  red300:   "#fca5a5",
  red600:   "#dc2626",
  amber50:  "#fffbeb",
  amber300: "#fde68a",
  amber500: "#f59e0b",
  blue50:   "#eff6ff",
  blue300:  "#bfdbfe",
  blue500:  "#3b82f6",
  green50:  "#f0fdf4",
  green300: "#86efac",
  green600: "#16a34a",
} as const;

// ─── Semantic tokens ──────────────────────────────────────────
export const LightTokens = {
  // Backgrounds
  bgApp:     Palette.slate50,
  bgSurface: Palette.white,
  bgSubtle:  Palette.slate100,
  bgMuted:   Palette.slate100,

  // Text
  textPrimary:   Palette.slate900,
  textSecondary: Palette.slate500,
  textMuted:     Palette.slate400,
  textTertiary:  Palette.slate400,
  textInverse:   Palette.white,

  // Border
  border:      Palette.slate200,
  borderLight: Palette.slate100,

  // Accent (teal)
  accent:      Palette.teal600,
  accentDark:  Palette.teal700,
  accentLight: Palette.teal50,
  accentSoft:  "#d8efea",
  accentText:  Palette.teal700,

  // Badges (legacy)
  badgeBg:   "#fef3c7",
  badgeText: "#92400e",

  // Glass
  glassBg:          "rgba(255,255,255,0.72)",
  glassBorder:      "rgba(255,255,255,0.55)",
  glassHighlight:   "rgba(255,255,255,0.85)",
  glassBgAndroid:   "rgba(255,255,255,0.94)",

  // Tab bar
  tabActive:   Palette.teal600,
  tabInactive: Palette.slate400,
  tabBarBg:    Palette.white,

  // Danger
  danger:       Palette.red600,
  dangerLight:  Palette.red50,
  dangerBorder: Palette.red300,

  // Status badges
  statusPlanned:   { bg: "#dbeafe", text: "#1d4ed8", label: "Planirano" },
  statusConfirmed: { bg: "#d1fae5", text: "#065f46", label: "Potvrđeno" },
  statusInTransit: { bg: "#fef3c7", text: "#92400e", label: "U tranzitu" },
  statusCompleted: { bg: "#dcfce7", text: "#15803d", label: "Završeno" },
  statusCancelled: { bg: "#fee2e2", text: "#b91c1c", label: "Otkazano" },

  // Severity
  severityInfo:     { bg: Palette.blue50,  border: Palette.blue300,  dot: Palette.blue500  },
  severityWarning:  { bg: Palette.amber50, border: Palette.amber300, dot: Palette.amber500 },
  severityCritical: { bg: Palette.red50,   border: Palette.red300,   dot: Palette.red600   },
} as const;

export type ThemeTokens = typeof LightTokens;

// ─── Accent system (kept for backward compat) ─────────────────
export type AccentTheme = "teal" | "blue" | "indigo";

const ACCENTS = {
  teal: {
    primary:      Palette.teal600,
    primaryDark:  Palette.teal700,
    primaryLight: Palette.teal50,
    primarySoft:  "#d8efea",
    badgeBg:   "#fef3c7",
    badgeText: "#92400e",
  },
  blue: {
    primary:      "#1f5fa8",
    primaryDark:  "#184a84",
    primaryLight: "#e7f0ff",
    primarySoft:  "#dbeafe",
    badgeBg:   "#fef3c7",
    badgeText: "#92400e",
  },
  indigo: {
    primary:      "#4b3ca7",
    primaryDark:  "#3c3085",
    primaryLight: "#ede9fe",
    primarySoft:  "#ddd6fe",
    badgeBg:   "#fef3c7",
    badgeText: "#92400e",
  },
} as const;

export const ACTIVE_ACCENT: AccentTheme = "teal";

export const Theme = {
  accent: ACCENTS[ACTIVE_ACCENT],
  text: {
    primary:   Palette.slate900,
    secondary: Palette.slate500,
    muted:     Palette.slate400,
    inverse:   Palette.white,
  },
  surface: {
    app:    Palette.slate50,
    card:   Palette.white,
    subtle: Palette.slate100,
    border: Palette.slate200,
  },
  status: {
    PLANNED:   { bg: "#dbeafe", text: "#1d4ed8",  label: "Planirano"  },
    CONFIRMED: { bg: "#d1fae5", text: "#065f46",  label: "Potvrđeno"  },
    IN_TRANSIT:{ bg: "#fef3c7", text: "#92400e",  label: "U tranzitu" },
    COMPLETED: { bg: "#dcfce7", text: "#15803d",  label: "Završeno"   },
    CANCELLED: { bg: "#fee2e2", text: "#b91c1c",  label: "Otkazano"   },
  },
} as const;

// ─── Radius ───────────────────────────────────────────────────
export const Radius = {
  xs:   6,
  sm:   10,
  md:   14,
  lg:   18,
  xl:   24,
  xxl:  32,
  full: 9999,
} as const;

// ─── Spacing ──────────────────────────────────────────────────
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  xxxl: 40,
} as const;

// ─── Typography ───────────────────────────────────────────────
export const Typography = {
  caption2:   { fontSize: 11, fontWeight: "400" as const, lineHeight: 14 },
  caption1:   { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
  footnote:   { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  subhead:    { fontSize: 15, fontWeight: "400" as const, lineHeight: 20 },
  callout:    { fontSize: 16, fontWeight: "400" as const, lineHeight: 21 },
  body:       { fontSize: 17, fontWeight: "400" as const, lineHeight: 22 },
  headline:   { fontSize: 17, fontWeight: "600" as const, lineHeight: 22 },
  title3:     { fontSize: 20, fontWeight: "400" as const, lineHeight: 25 },
  title2:     { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  title1:     { fontSize: 28, fontWeight: "700" as const, lineHeight: 34 },
  largeTitle: { fontSize: 34, fontWeight: "800" as const, lineHeight: 41 },
} as const;

// ─── Shadows ──────────────────────────────────────────────────
export const Shadows = {
  card: {
    shadowColor:   Palette.black,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius:  10,
    elevation:     3,
  },
  glass: {
    shadowColor:   Palette.black,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius:  16,
    elevation:     6,
  },
  pill: {
    shadowColor:   Palette.black,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius:  8,
    elevation:     4,
  },
} as const;

// ─── Platform helpers ─────────────────────────────────────────
export const isIOS     = Platform.OS === "ios";
export const isAndroid = Platform.OS === "android";
export const supportsBlur = Platform.OS === "ios";

// ─── useIOSGlassTheme hook ────────────────────────────────────
export function useIOSGlassTheme(): {
  theme: ThemeTokens;
  isIOS: boolean;
  isAndroid: boolean;
  supportsBlur: boolean;
  isDark: boolean;
} {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return {
    theme: LightTokens,
    isIOS,
    isAndroid,
    supportsBlur,
    isDark,
  };
}

// ─── Utility ──────────────────────────────────────────────────
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
    hour12: false,
  })
    .format(date)
    .replace(",", ".");
}
