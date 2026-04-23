import AsyncStorage from "@react-native-async-storage/async-storage";

const OFFLINE_QUEUE_KEY = "tms_offline_write_queue_v1";
const GPS_LOG_PATH = "/api/gps-logs";
const GPS_BATCH_SIZE = 50;

export type OfflineWriteMethod = "POST" | "PATCH" | "DELETE";

export type OfflineWriteItem = {
  id: string;
  method: OfflineWriteMethod;
  path: string;
  body?: unknown;
  createdAt: string;
  retries: number;
};

type QueueCountListener = (count: number) => void;
const queueCountListeners = new Set<QueueCountListener>();

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getOfflineWriteQueue(): Promise<OfflineWriteItem[]> {
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
  for (const listener of queueCountListeners) {
    listener(items.length);
  }
}

export async function enqueueOfflineWrite(item: Omit<OfflineWriteItem, "id" | "createdAt" | "retries">): Promise<void> {
  const queue = await getOfflineWriteQueue();
  queue.push({
    ...item,
    id: randomId(),
    createdAt: new Date().toISOString(),
    retries: 0
  });
  await setOfflineWriteQueue(queue);
}

export async function clearOfflineWriteQueue(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  for (const listener of queueCountListeners) {
    listener(0);
  }
}

export async function getOfflineWriteQueueCount(): Promise<number> {
  const items = await getOfflineWriteQueue();
  return items.length;
}

export function subscribeOfflineQueueCount(listener: QueueCountListener): () => void {
  queueCountListeners.add(listener);
  void getOfflineWriteQueueCount().then((count) => {
    if (queueCountListeners.has(listener)) {
      listener(count);
    }
  });

  return () => {
    queueCountListeners.delete(listener);
  };
}

export function isLikelyOfflineError(error: unknown): boolean {
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

export async function flushOfflineWriteQueue(
  executor: (item: OfflineWriteItem) => Promise<void>
): Promise<{ processed: number; remaining: number }> {
  const queue = await getOfflineWriteQueue();
  if (!queue.length) {
    return { processed: 0, remaining: 0 };
  }

  const nextQueue: OfflineWriteItem[] = [];
  let processed = 0;
  let hardStop = false;

  for (let i = 0; i < queue.length; i += 1) {
    const item = queue[i];

    if (hardStop) {
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

      const settled = await Promise.allSettled(batch.map((entry) => executor(entry)));
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

  await setOfflineWriteQueue(nextQueue);
  return { processed, remaining: nextQueue.length };
}
