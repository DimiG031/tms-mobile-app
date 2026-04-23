import { Stack } from "expo-router";

export default function ChatLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Poruke" }} />
      <Stack.Screen name="new" options={{ title: "Novi razgovor" }} />
      <Stack.Screen name="[id]" options={{ title: "Razgovor" }} />
    </Stack>
  );
}

