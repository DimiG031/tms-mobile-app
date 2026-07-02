// OSM Nominatim geokodiranje kao rezerva kad backend nema lat/lng za stanicu.
// Poštuje Nominatim politiku: max ~1 zahtev u sekundi, uz keš u memoriji.

export type LatLng = { lat: number; lng: number };

const cache = new Map<string, LatLng | null>();
let chain: Promise<unknown> = Promise.resolve();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Serijalizuje pozive i drži razmak od ~1.1s između njih.
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = chain.then(() => fn());
  chain = result.then(
    () => delay(1100),
    () => delay(1100)
  );
  return result;
}

export async function geocodeAddress(query: string): Promise<LatLng | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  const result = await enqueue(async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
      const first = Array.isArray(data) ? data[0] : undefined;
      if (first?.lat && first?.lon) {
        const lat = Number(first.lat);
        const lng = Number(first.lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
      }
      return null;
    } catch {
      return null;
    }
  });

  cache.set(key, result);
  return result;
}
