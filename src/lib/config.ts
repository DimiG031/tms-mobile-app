import { Platform } from "react-native";

function resolveApiUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim() || "http://localhost:3000";

  // Android emulator cannot access host machine through localhost.
  if (Platform.OS === "android") {
    return configured
      .replace("://localhost", "://10.0.2.2")
      .replace("://127.0.0.1", "://10.0.2.2");
  }

  return configured;
}

export const config = {
  apiUrl: resolveApiUrl()
};
