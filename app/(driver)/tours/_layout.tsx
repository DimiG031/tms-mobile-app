import { Stack } from "expo-router";

export default function ToursLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#f2f2f7" }
      }}
    >
      <Stack.Screen name="index" options={{ title: "Moje ture" }} />
      <Stack.Screen name="[id]" options={{ title: "Detalji ture" }} />
      <Stack.Screen name="[id]/expense" options={{ title: "Troskovnik" }} />
      <Stack.Screen name="[id]/documents" options={{ title: "Dokumenta" }} />
    </Stack>
  );
}
