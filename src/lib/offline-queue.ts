import { isStopMovement, isStopActionPath, stopRank } from "@/lib/stopActionState";
import { readSession } from "@/lib/secure-store";
import { config } from "@/lib/config";
import { offlineOwner } from "@/lib/offline-owner";
import AsyncStorage from "@react-native-async-storage/async-storage";

const OFFLINE_QUEUE_KEY = "tms_offline_write_queue_v1";
const STOP_RECEIPTS_KEY = "route_stop_receipts_v1";
const GPS_LOG_PATH = "/api/gps-logs";
const GPS_BATCH_SIZE = 50;

export type OfflineWriteMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export type OfflineWriteItem = {
  /** Correlation only; optional for items created by previous app versions. */
  traceId?: string;
  /** Stable document operation nonce, distinct from tracing. Persist before first send. */
  operationKey?: string;
  blocked?: boolean;
  failureStatus?: number;
  failureMessage?: string;
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

export async function enqueueOfflineWrite(item: Omit<OfflineWriteItem, "id" | "createdAt" | "retries" | "owner">, owner?: string | null): Promise<OfflineWriteItem> {
  const capturedOwner = owner === undefined ? await currentOwner() : owner;
  if (!capturedOwner) throw new Error("Za čuvanje zahteva potrebna je prijava.");
  return withStorageLock(async () => {
    const queue = await readQueue();
    if (isStopMovement(item.path, item.body)) {
      if (queue.some(entry => entry.owner === capturedOwner && entry.path === item.path && entry.method === "POST")) throw new Error("Zahtev za ovu stanicu već čeka potvrdu servera.");
      const receipt = (await readStopReceipts()).find(entry => entry.owner === capturedOwner && entry.path === item.path);
      const action = (item.body as { action: string }).action;
      if (receipt && (stopRank(receipt.status) >= 2 || (action === "ARRIVED" && stopRank(receipt.status) >= 1))) throw new Error("Ova akcija stanice je već potvrđena. Osvežite prikaz.");
    }
    const record: OfflineWriteItem = {
      ...item,
      owner: capturedOwner,
      id: randomId(),
      createdAt: new Date().toISOString(),
      retries: 0
    };
    queue.push(record);
    await setOfflineWriteQueue(queue);
    return record;
  });
}

/** Manual retry preserves original owner, body and operation key. */
export async function retryOfflineDocument(id: string, expectedOwner: string): Promise<OfflineWriteItem> {
  if (flushInFlight) await flushInFlight;
  return withStorageLock(async () => {
    if (await currentOwner() !== expectedOwner) throw new Error("Nalog za slanje je promenjen.");
    const queue = await readQueue();
    const record = queue.find(item => item.id === id && item.owner === expectedOwner);
    if (!record || record.method !== "POST" || record.path !== "/api/documents" || !record.operationKey) {
      throw new Error("Zahtev nije dostupan za bezbedno ponavljanje. Proverite listu dokumenata.");
    }
    const next = { ...record, blocked: false, failureStatus: undefined, failureMessage: undefined };
    await setOfflineWriteQueue(queue.map(item => item.id === id ? next : item));
    return next;
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

    if (item.blocked || hardStop || await currentOwner() !== owner) {
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
      const status = (error as { status?: number })?.status;
      if (item.method === "POST" && (item.path === "/api/documents" || isStopMovement(item.path, item.body))
        && typeof status === "number" && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        nextQueue.push({ ...item, blocked: true, failureStatus: status,
          failureMessage: error instanceof Error ? error.message : "Zahtev nije prihvaćen.",
          retries: item.retries + 1 });
      } else if (isLikelyOfflineError(error)) {
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
    for (const listener of paths.length ? deliveryListeners : []) {
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


export type StopReceipt = { owner: string; path: string; status: string };
async function readStopReceipts(): Promise<StopReceipt[]> {
  const raw = await AsyncStorage.getItem(STOP_RECEIPTS_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Neispravno lokalno stanje potvrda stanica.");
  return parsed.filter((entry): entry is StopReceipt => Boolean(entry && typeof entry.owner === "string" && typeof entry.path === "string" && isStopActionPath(entry.path) && ["PLANNED", "ARRIVED", "DEPARTED", "CANCELED"].includes(entry.status)));
}
/** Persist the acknowledgement BEFORE removing the queued write, under the same storage lock. */
export async function acknowledgeStopAction(item: OfflineWriteItem, status: string): Promise<void> {
  if (!item.owner || !isStopMovement(item.path, item.body) || !["ARRIVED", "DEPARTED", "CANCELED"].includes(status)) throw new Error("Neispravna potvrda stanice.");
  await withStorageLock(async () => {
    const receipts = await readStopReceipts();
    const old = receipts.find(entry => entry.owner === item.owner && entry.path === item.path);
    if (old && stopRank(old.status) > stopRank(status)) return;
    await AsyncStorage.setItem(STOP_RECEIPTS_KEY, JSON.stringify([...receipts.filter(entry => entry !== old), { owner: item.owner, path: item.path, status }]));
  });
}
export async function getStopActionSnapshot(): Promise<{ queue: OfflineWriteItem[]; receipts: StopReceipt[] }> {
  const owner = await currentOwner();
  if (!owner) return { queue: [], receipts: [] };
  return withStorageLock(async () => ({ queue: (await readQueue()).filter(item => item.owner === owner && isStopMovement(item.path, item.body)), receipts: (await readStopReceipts()).filter(item => item.owner === owner) }));
}
export async function retryOfflineStop(id: string, expectedOwner: string, operationKey: string): Promise<OfflineWriteItem> {
  if (flushInFlight) await flushInFlight;
  return withStorageLock(async () => {
    if (await currentOwner() !== expectedOwner) throw new Error("Nalog za slanje je promenjen.");
    const queue = await readQueue(); const item = queue.find(entry => entry.id === id && entry.owner === expectedOwner);
    if (!item || !isStopMovement(item.path, item.body)) throw new Error("Zahtev stanice više nije na čekanju. Osvežite prikaz.");
    const next = { ...item, operationKey: item.operationKey ?? operationKey, blocked: false, failureStatus: undefined, failureMessage: undefined };
    await setOfflineWriteQueue(queue.map(entry => entry.id === id ? next : entry)); return next;
  });
}
export async function dismissRejectedStop(id: string, expectedOwner: string): Promise<void> {
  if (flushInFlight) await flushInFlight;
  await withStorageLock(async () => {
    if (await currentOwner() !== expectedOwner) throw new Error("Nalog je promenjen.");
    const queue = await readQueue(); const item = queue.find(entry => entry.id === id && entry.owner === expectedOwner);
    if (!item || !isStopMovement(item.path, item.body) || !item.blocked) throw new Error("Zahtev bez potvrđenog odbijanja ne može se odbaciti.");
    await setOfflineWriteQueue(queue.filter(entry => entry !== item));
  });
}
