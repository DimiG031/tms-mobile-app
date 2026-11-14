import { readSession } from "@/lib/secure-store";
import { config } from "@/lib/config";
import { offlineOwner } from "@/lib/offline-owner";
import AsyncStorage from "@react-native-async-storage/async-storage";

const OFFLINE_QUEUE_KEY = "tms_offline_write_queue_v1";
const GPS_LOG_PATH = "/api/gps-logs";
const GPS_BATCH_SIZE = 50;

export type OfflineWriteMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export type OfflineWriteItem = {
  /** Correlation only; optional for items created by previous app versions. */
  traceId?: string;
  /** Missing on legacy entries: never automatically adopt or replay those. */
  owner?: string;
  id: string;
  method: OfflineWriteMethod;
  path: string;
  body?: unknown;
  createdAt: string;
  retries: number;
};

type QueueCountListener = (count: number) => void;
const queueCountListeners = new Set<QueueCountListener>();
const deliveryListeners = new Set<(paths: readonly string[]) => void>();
export function subscribeOfflineWritesDelivered(listener: (paths: readonly string[]) => void): () => void {
  deliveryListeners.add(listener);
  return () => { deliveryListeners.delete(listener); };
}

// Storage mutations are serialized, but network requests never hold this lock.
let storageTail: Promise<unknown> = Promise.resolve();
let flushInFlight: Promise<{ processed: number; remaining: number }> | null = null;
function withStorageLock<T>(work: () => Promise<T>): Promise<T> {
  const result = storageTail.then(work);
  storageTail = result.catch(() => undefined);
  return result;
}
function notifyCount(count: number): void {
  for (const listener of queueCountListeners) {
    try { listener(count); } catch { /* A view cannot fail a persisted write. */ }
  }
}

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function currentOwner(): Promise<string | null> {
  return offlineOwner(await readSession(), config.apiUrl);
}

async function readQueue(): Promise<OfflineWriteItem[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OfflineWriteItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

async function setOfflineWriteQueue(items: OfflineWriteItem[]): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  const owner = await currentOwner();
  notifyCount(owner ? items.filter(item => item.owner === owner).length : 0);
}

export async function enqueueOfflineWrite(item: Omit<OfflineWriteItem, "id" | "createdAt" | "retries" | "owner">, owner?: string | null): Promise<void> {
  const capturedOwner = owner === undefined ? await currentOwner() : owner;
  if (!capturedOwner) throw new Error("Za čuvanje zahteva potrebna je prijava.");
  await withStorageLock(async () => {
    const queue = await readQueue();
    queue.push({
      ...item,
      owner: capturedOwner,
      id: randomId(),
      createdAt: new Date().toISOString(),
      retries: 0
    });
    await setOfflineWriteQueue(queue);
  });
}

export async function clearOfflineWriteQueue(): Promise<void> {
  const owner = await currentOwner();
  if (!owner) return;
  await withStorageLock(async () => {
    const remaining = (await readQueue()).filter(item => item.owner !== owner);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    notifyCount(0);
  });
}

export async function getOfflineWriteQueue(): Promise<OfflineWriteItem[]> {
  const owner = await currentOwner();
  if (!owner) return [];
  return withStorageLock(async () => (await readQueue()).filter(item => item.owner === owner));
}

/** Preserve legacy records; surface their existence without exposing their contents. */
export function getUnownedOfflineWriteCount(): Promise<number> {
  return withStorageLock(async () => (await readQueue()).filter(item => !item.owner).length);
}

export async function getOfflineWriteQueueCount(): Promise<number> {
  const items = await getOfflineWriteQueue();
  return items.length;
}

export function subscribeOfflineQueueCount(listener: QueueCountListener): () => void {
  queueCountListeners.add(listener);
  void getOfflineWriteQueueCount().then((count) => {
    if (queueCountListeners.has(listener)) {
      try { listener(count); } catch { /* Isolate view callbacks. */ }
    }
  }).catch(() => { /* The next queue operation can retry storage. */ });

  return () => {
    queueCountListeners.delete(listener);
  };
}

export function isLikelyOfflineError(error: unknown): boolean {
  // ApiError mrežne greške nose isNetwork flag (poruka je prevedena na srpski).
  if (error && typeof error === "object" && (error as { isNetwork?: boolean }).isNetwork === true) {
    return true;
  }
  const text = error instanceof Error ? error.message : String(error);
  const normalized = text.toLowerCase();
  return (
    normalized.includes("network request failed") ||
    normalized.includes("network error") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("timed out") ||
    normalized.includes("socket")
  );
}

async function flushSnapshot(
  executor: (item: OfflineWriteItem) => Promise<void>
): Promise<{ processed: number; remaining: number }> {
  const owner = await currentOwner();
  if (!owner) return { processed: 0, remaining: 0 };
  const queue = await withStorageLock(async () => (await readQueue()).filter(item => item.owner === owner));
  if (!queue.length) {
    return { processed: 0, remaining: 0 };
  }

  const nextQueue: OfflineWriteItem[] = [];
  let processed = 0;
  let hardStop = false;

  for (let i = 0; i < queue.length; i += 1) {
    const item = queue[i];

    if (hardStop || await currentOwner() !== owner) {
      nextQueue.push(item);
      continue;
    }

    if (item.method === "POST" && item.path === GPS_LOG_PATH) {
      const batch: OfflineWriteItem[] = [item];
      let cursor = i + 1;
      while (
        cursor < queue.length &&
        batch.length < GPS_BATCH_SIZE &&
        queue[cursor].method === "POST" &&
        queue[cursor].path === GPS_LOG_PATH
      ) {
        batch.push(queue[cursor]);
        cursor += 1;
      }

      const settled = await Promise.allSettled(batch.map(async (entry) => {
        if (await currentOwner() !== owner) throw new Error("Sesija za slanje je promenjena.");
        await executor(entry);
      }));
      let batchWentOffline = false;

      for (let idx = 0; idx < settled.length; idx += 1) {
        const result = settled[idx];
        const batchItem = batch[idx];

        if (result.status === "fulfilled") {
          processed += 1;
          continue;
        }

        if (isLikelyOfflineError(result.reason)) {
          batchWentOffline = true;
          nextQueue.push(batchItem);
        } else {
          nextQueue.push({
            ...batchItem,
            retries: batchItem.retries + 1
          });
        }
      }

      if (batchWentOffline) {
        hardStop = true;
      }

      i = cursor - 1;
      continue;
    }

    try {
      await executor(item);
      processed += 1;
    } catch (error) {
      if (isLikelyOfflineError(error)) {
        hardStop = true;
        nextQueue.push(item);
      } else {
        nextQueue.push({
          ...item,
          retries: item.retries + 1
        });
      }
    }
  }

  const result = await withStorageLock(async () => {
    const current = await readQueue();
    const snapshotIds = new Set(queue.map(item => item.id));
    const currentIds = new Set(current.map(item => item.id));
    // Preserve new enqueues, and never revive entries cleared during the request.
    const merged = [
      ...nextQueue.filter(item => currentIds.has(item.id)),
      ...current.filter(item => !snapshotIds.has(item.id))
    ];
    await setOfflineWriteQueue(merged);
    return { processed, remaining: merged.filter(item => item.owner === owner).length };
  });
  if (processed && await currentOwner() === owner) {
    const pendingIds = new Set(nextQueue.map(item => item.id));
    const paths = [...new Set(queue.filter(item => !pendingIds.has(item.id)).map(item => item.path))];
    for (const listener of deliveryListeners) {
      try { listener(paths); } catch { /* Delivery remains acknowledged. */ }
    }
  }
  return result;
}

export function flushOfflineWriteQueue(
  executor: (item: OfflineWriteItem) => Promise<void>
): Promise<{ processed: number; remaining: number }> {
  if (!flushInFlight) {
    flushInFlight = flushSnapshot(executor).finally(() => { flushInFlight = null; });
  }
  return flushInFlight;
}

