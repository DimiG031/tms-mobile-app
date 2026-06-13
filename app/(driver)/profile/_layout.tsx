import { Stack } from "expo-router";
import { useTheme } from "@/providers/ThemeProvider";

export default function ProfileLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.surface.card },
        headerTintColor: theme.accent.primary,
        headerTitleStyle: { color: theme.text.primary }
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: "Podešavanja" }} />
      <Stack.Screen name="stats" options={{ title: "Moja statistika" }} />
    </Stack>
  );
}
