/** Development-only comparison; never retry across transports after an uncertain write. */
export function fetchForRequest(path: string, method: string): typeof fetch {
  if (typeof __DEV__ !== "undefined" && __DEV__ &&
      typeof process !== "undefined" && process.env.EXPO_PUBLIC_GPS_EXPO_FETCH === "1" &&
      path === "/api/gps-logs" && method === "POST") {
    return require("expo/fetch").fetch as typeof fetch;
  }
  return fetch;
}
