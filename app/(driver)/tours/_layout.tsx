import { Stack } from "expo-router";

export default function ToursLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#f2f2f7" },
        headerTintColor: "#0d7d72",
        headerTitleStyle: { color: "#1e293b" }
      }}
    >
      <Stack.Screen name="index" options={{ title: "Moje ture" }} />
      <Stack.Screen name="[id]" options={{ title: "Detalji ture" }} />
      <Stack.Screen name="[id]/details" options={{ title: "Detaljnije" }} />
      <Stack.Screen name="[id]/expense" options={{ title: "Troškovnik" }} />
      <Stack.Screen name="[id]/documents" options={{ title: "Dokumenta" }} />
    </Stack>
  );
}
