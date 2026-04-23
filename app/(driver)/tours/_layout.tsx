import { Stack } from "expo-router";

export default function ToursLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Moje ture" }} />
      <Stack.Screen name="[id]" options={{ title: "Detalji ture" }} />
      <Stack.Screen name="[id]/expense" options={{ title: "Troškovnik" }} />
      <Stack.Screen name="[id]/documents" options={{ title: "Dokumenta" }} />
    </Stack>
  );
}


