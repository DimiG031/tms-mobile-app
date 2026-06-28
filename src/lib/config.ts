import { Platform } from "react-native";

const PRODUCTION_API_URL = "https://tms.softechrs.com";

function isLocalhostUrl(url: string): boolean {
  return url.includes("://localhost") || url.includes("://127.0.0.1") || url.includes("://10.0.2.2");
}

function resolveApiUrl() {
  let configured = process.env.EXPO_PUBLIC_API_URL?.trim() || (__DEV__ ? "http://localhost:3000" : PRODUCTION_API_URL);

  // U produkciji (release/OTA build, nema Metro-a) nikad ne gađamo localhost —
  // bundle ume da ugradi localhost iz .env, a na pravom telefonu to ne radi.
  if (!__DEV__ && isLocalhostUrl(configured)) {
    configured = PRODUCTION_API_URL;
  }

  // Android emulator ne vidi host preko localhost — preusmeri na 10.0.2.2 (samo dev).
  if (Platform.OS === "android") {
    return configured.replace("://localhost", "://10.0.2.2").replace("://127.0.0.1", "://10.0.2.2");
  }

  return configured;
}

export const config = {
  apiUrl: resolveApiUrl()
};
