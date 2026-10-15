import { Stack } from "expo-router";
import { useTheme } from "@/providers/ThemeProvider";

export default function PutniListLayout() {
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
      <Stack.Screen name="[id]" options={{ title: "Putni list" }} />
    </Stack>
  );
}
