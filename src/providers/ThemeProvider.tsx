import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { DarkTheme, Theme, type AppThemeTokens } from "@/lib/theme";
import { useAuth } from "@/providers/AuthProvider";
import { useMobileProfile } from "@/queries/useMobileProfile";
import type { MobileThemePreference } from "@/lib/types";

export type AppTheme = AppThemeTokens & {
  isDark: boolean;
  mode: "light" | "dark";
  preference: MobileThemePreference;
};

const LIGHT: AppTheme = { ...Theme, isDark: false, mode: "light", preference: "system" };

const ThemeContext = createContext<AppTheme>(LIGHT);

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { session } = useAuth();
  const profileQuery = useMobileProfile(Boolean(session));
  const systemScheme = useColorScheme();
  const preference = (profileQuery.data?.settings.theme as MobileThemePreference | null) ?? "system";

  const value = useMemo<AppTheme>(() => {
    const resolved = preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;
    const tokens = resolved === "dark" ? DarkTheme : Theme;
    return { ...tokens, isDark: resolved === "dark", mode: resolved, preference };
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}
