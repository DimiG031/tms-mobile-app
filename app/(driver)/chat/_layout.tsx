import { Stack } from "expo-router";
import { useTheme } from "@/providers/ThemeProvider";

export default function ChatLayout() {
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
      <Stack.Screen name="index" options={{ title: "Poruke" }} />
      <Stack.Screen name="new" options={{ title: "Novi razgovor" }} />
      <Stack.Screen name="[id]" options={{ title: "Razgovor" }} />
    </Stack>
  );
}
