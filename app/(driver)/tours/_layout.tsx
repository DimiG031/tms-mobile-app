import { Stack } from "expo-router";
import { useTheme } from "@/providers/ThemeProvider";

export default function ToursLayout() {
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
      <Stack.Screen name="index" options={{ title: "Moje ture" }} />
      <Stack.Screen name="[id]" options={{ title: "Detalji ture" }} />
      <Stack.Screen name="[id]/details" options={{ title: "Detaljnije" }} />
      <Stack.Screen name="[id]/map" options={{ title: "Mapa rute" }} />
      <Stack.Screen name="[id]/expense" options={{ title: "Troškovnik" }} />
      <Stack.Screen name="[id]/documents" options={{ title: "Dokumenta" }} />
      <Stack.Screen name="[id]/checklist" options={{ title: "Checklist" }} />
      <Stack.Screen name="[id]/issues" options={{ title: "Prijavi problem" }} />
      <Stack.Screen name="[id]/sos" options={{ title: "SOS" }} />
    </Stack>
  );
}
