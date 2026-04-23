import { config } from "@/lib/config";
import { clearSession, readSession, saveSession } from "@/lib/secure-store";
import type { MobileRefreshResponse } from "@/lib/types";
import {
  enqueueOfflineWrite,
  flushOfflineWriteQueue,
  type OfflineWriteItem,
  type OfflineWriteMethod,
  isLikelyOfflineError
} from "@/lib/offline-queue";

let refreshInFlight: Promise<string | null> | null = null;
let queueFlushInFlight: Promise<void> | null = null;

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
type QueuedResult<T> = { queued: false; data: T } | { queued: true; data: null };

async function refreshToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const current = await readSession();
      if (!current?.refreshToken) return null;

      const response = await fetch(`${config.apiUrl}/api/auth/mobile-refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: current.refreshToken })
      });

      if (!response.ok) {
        await clearSession();
        return null;
      }

      const payload = (await response.json()) as MobileRefreshResponse;
      const nextToken = payload.data.token;
      await saveSession({ ...current, token: nextToken });
      return nextToken;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const run = async (token?: string | null) =>
    fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });

  const session = await readSession();
  let response = await run(session?.token);

  if (response.status === 401 && session?.refreshToken) {
    const nextToken = await refreshToken();
    if (!nextToken) {
      throw new Error("Sesija je istekla");
    }
    response = await run(nextToken);
  }

  if (!response.ok) {
    const rawText = await response.text();
    let message = rawText;

    try {
      const parsed = JSON.parse(rawText) as { error?: unknown; message?: unknown };
      if (typeof parsed.error === "string" && parsed.error.trim()) {
        message = parsed.error;
      } else if (typeof parsed.message === "string" && parsed.message.trim()) {
        message = parsed.message;
      }
    } catch {
      // Keep raw text when body is not JSON.
    }

    throw new Error(message || `Zahtev nije uspeo: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function requestNoContent(method: HttpMethod, path: string, body?: unknown): Promise<void> {
  await request<unknown>(method, path, body);
}

async function flushQueuedWritesInternal(): Promise<void> {
  await flushOfflineWriteQueue(async (item: OfflineWriteItem) => {
    await requestNoContent(item.method, item.path, item.body);
  });
}

function scheduleQueueFlush(): void {
  if (!queueFlushInFlight) {
    queueFlushInFlight = flushQueuedWritesInternal()
      .catch(() => {
        // Ignore and retry on next trigger.
      })
      .finally(() => {
        queueFlushInFlight = null;
      });
  }
}

async function writeQueued<T>(method: OfflineWriteMethod, path: string, body?: unknown): Promise<QueuedResult<T>> {
  try {
    const data = await request<T>(method, path, body);
    scheduleQueueFlush();
    return { queued: false, data };
  } catch (error) {
    if (!isLikelyOfflineError(error)) {
      throw error;
    }

    await enqueueOfflineWrite({ method, path, body });
    return { queued: true, data: null };
  }
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  postQueued: <T>(path: string, body?: unknown) => writeQueued<T>("POST", path, body),
  patchQueued: <T>(path: string, body?: unknown) => writeQueued<T>("PATCH", path, body),
  deleteQueued: <T>(path: string) => writeQueued<T>("DELETE", path),
  flushOfflineWrites: async () => {
    await flushQueuedWritesInternal();
  }
};
