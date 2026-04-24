import { Stack } from "expo-router";

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#f2f2f7" }
      }}
    >
      <Stack.Screen name="index" options={{ title: "Poruke" }} />
      <Stack.Screen name="new" options={{ title: "Novi razgovor" }} />
      <Stack.Screen name="[id]" options={{ title: "Razgovor" }} />
    </Stack>
  );
}
