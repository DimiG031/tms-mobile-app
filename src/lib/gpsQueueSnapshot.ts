import { mobileDiagnostic } from "@/lib/diagnostics";
import type { OfflineWriteItem } from "@/lib/offline-queue";

function time(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return null;
  const parsed = Date.parse(value);
  const canonical = value.includes(".") ? value : value.replace("Z", ".000Z");
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === canonical ? parsed : null;
}

/** Input must already be scoped by getOfflineWriteQueue to the current account/server. */
export function gpsQueueSnapshot(items: readonly OfflineWriteItem[]) {
  const gps = items.filter(item => item.method === "POST" && item.path === "/api/gps-logs");
  const measurements = gps.map(item => time((item.body as { timestamp?: unknown } | null)?.timestamp));
  const queued = gps.map(item => time(item.createdAt));
  function range(values: (number | null)[]) {
    let min = Infinity, max = -Infinity;
    for (const value of values) if (value !== null) { min = Math.min(min, value); max = Math.max(max, value); }
    return Number.isFinite(min) ? [new Date(min).toISOString(), new Date(max).toISOString()] : [];
  }
  const [oldestMeasurementAt, newestMeasurementAt] = range(measurements);
  const [oldestQueuedAt, newestQueuedAt] = range(queued);
  return { gpsPending: gps.length, invalidMeasurementTimes: measurements.filter(value => value === null).length,
    oldestMeasurementAt, newestMeasurementAt, oldestQueuedAt, newestQueuedAt };
}

/** Optional read-only development diagnostic; never await it in the sending path. */
export async function reportGpsQueueSnapshot(read: () => Promise<OfflineWriteItem[]>): Promise<void> {
  if (typeof __DEV__ === "undefined" || !__DEV__) return;
  try { mobileDiagnostic("info", "queue.snapshot", { operation: "gps", ...gpsQueueSnapshot(await read()) }); }
  catch { /* Diagnostics cannot change persistence or delivery. */ }
}
