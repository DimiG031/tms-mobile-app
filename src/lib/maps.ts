import { Alert, Linking } from "react-native";
import type { TourStop } from "@/lib/types";

type StopLike = Pick<TourStop, "address" | "locationName" | "companyName" | "city" | "country">;

// Build a maps destination query from a stop's address (coordinates can be
// added later when the backend provides them per stop).
export function stopMapsQuery(stop: StopLike): string | null {
  const primary = stop.address ?? stop.locationName ?? stop.companyName ?? null;
  const parts = [primary, stop.city, stop.country].filter(Boolean) as string[];
  return parts.length ? parts.join(", ") : null;
}

// Open native maps (Google/Apple) with turn-by-turn directions to the query.
export function openMapsNavigation(query: string) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  Linking.openURL(url).catch(() => Alert.alert("Mape", "Otvaranje mapa nije uspelo na ovom uređaju."));
}
