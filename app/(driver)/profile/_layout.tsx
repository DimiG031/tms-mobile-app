import { Stack } from "expo-router";

export default function ProfileLayout() {
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: "Podešavanja" }} />
    </Stack>
  );
}
