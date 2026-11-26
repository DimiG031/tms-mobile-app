import { fetchForRequest } from "@/lib/gpsTransport";
import { reportGpsQueueSnapshot } from "@/lib/gpsQueueSnapshot";
import { isStopMovement, stopIdFromPath } from "@/lib/stopActionState";
import { mobileDiagnostic, isTraceId, newTraceId, requestOperation, TRACE_HEADER } from "@/lib/diagnostics";
import { config } from "@/lib/config";
import { readSession, replaceSessionIfCurrent, getSessionRevision, assertSessionRevision, SessionChangedError } from "@/lib/secure-store";
import { offlineOwner } from "@/lib/offline-owner";
import type { AuthSession, MobileRefreshResponse } from "@/lib/types";
import {
  enqueueOfflineWrite,
  getOfflineWriteQueue,
  retryOfflineDocument,
  retryOfflineStop,
  dismissRejectedStop,
  acknowledgeStopAction,
  flushOfflineWriteQueue,
  type OfflineWriteItem,
  type OfflineWriteMethod,
  isLikelyOfflineError
} from "@/lib/offline-queue";

const refreshes = new Map<string, Promise<string | null>>();
let queueFlushInFlight: Promise<void> | null = null;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type QueuedResult<T> = { queued: false; data: T; noticeScheduled?: boolean } | { queued: true; data: null; delivery?: "pending" | "blocked"; message?: string };
const stationAttempts = new Map<string, { data?: unknown; acknowledged?: boolean }>();
const documentAttempts = new Map<string, { data?: unknown; acknowledged?: boolean }>();
const DOCUMENT_PENDING_MESSAGE = "Zahtev je sačuvan na uređaju. Potvrda servera još nije stigla. Aplikacija će automatski pokušati ponovo.";


export class ApiError extends Error {
  status: number;
  isNetwork: boolean;
  isInactive: boolean;
  retryAfterMs?: number;
  constructor(message: string, status: number, isNetwork = false, isInactive = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isNetwork = isNetwork;
    this.isInactive = isInactive;
  }
}

// Zamrznut nalog: kad backend vrati "AccountInactive", app treba da prikaže
// blok-ekran. AuthProvider registruje handler koji postavlja „inactive" stanje.
let accountInactiveHandler: (() => void) | null = null;
export function setAccountInactiveHandler(handler: (() => void) | null): void {
  accountInactiveHandler = handler;
}

// Generičke (najčešće engleske) backend poruke koje zamenjujemo srpskim tekstom.
const GENERIC_BACKEND_MESSAGES = new Set([
  "unauthorized",
  "forbidden",
  "not found",
  "bad request",
  "server error",
  "internal server error",
  "error"
]);

function isMeaningfulBackendMessage(message?: string): boolean {
  const trimmed = message?.trim();
  if (!trimmed) return false;
  return !GENERIC_BACKEND_MESSAGES.has(trimmed.toLowerCase());
}

function serbianMessageForStatus(status: number): string {
  if (status === 401) return "Sesija je istekla. Prijavite se ponovo.";
  if (status === 403) return "Nemate dozvolu za ovu radnju.";
  if (status === 404) return "Traženi podatak nije pronađen.";
  if (status === 408 || status === 504) return "Zahtev je istekao. Pokušajte ponovo.";
  if (status === 429) return "Previše zahteva. Sačekajte malo pa pokušajte ponovo.";
  if (status >= 500) return "Greška na serveru. Pokušajte kasnije ili kontaktirajte administratora.";
  if (status >= 400) return "Neispravan zahtev. Proverite unete podatke.";
  return "Došlo je do greške. Pokušajte ponovo.";
}

const NETWORK_ERROR_MESSAGE = "Nema veze sa serverom. Proverite internet i pokušajte ponovo.";

async function refreshToken(traceId: string, current: AuthSession): Promise<string | null> {
  if (!current.refreshToken) return null;
  const active = await readSession();
  if (!active || active.refreshToken !== current.refreshToken || offlineOwner(active, config.apiUrl) !== offlineOwner(current, config.apiUrl)) return null;
  if (active.token !== current.token) return active.token;
  const key = JSON.stringify([offlineOwner(current, config.apiUrl), current.refreshToken]);
  let pending = refreshes.get(key);
  if (!pending) {
    pending = (async () => {
      mobileDiagnostic("debug", "refresh.started", { traceId, operation: "auth.refresh" });
      const response = await fetch(`${config.apiUrl}/api/auth/mobile-refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", [TRACE_HEADER]: traceId },
        body: JSON.stringify({ refreshToken: current.refreshToken })
      });
      if (!response.ok) {
        mobileDiagnostic("warn", "refresh.failed", { traceId, operation: "auth.refresh", status: response.status });
        await replaceSessionIfCurrent(current, null);
        return null;
      }
      const payload = (await response.json()) as MobileRefreshResponse;
      const nextToken = payload.data.token;
      if (!(await replaceSessionIfCurrent(current, { ...current, token: nextToken }))) return null;
      mobileDiagnostic("info", "refresh.completed", { traceId, operation: "auth.refresh", status: response.status });
      return nextToken;
    })().finally(() => { refreshes.delete(key); });
    refreshes.set(key, pending);
  }
  return pending;
}

async function requestUntraced<T>(method: HttpMethod, path: string, body: unknown, traceId: string, onStatus: (status: number) => void, expectedOwner: string | undefined, revision: number, allowOldAcknowledgement: boolean, operationKey?: string): Promise<T> {
  const run = async (token?: string | null) =>
    fetchForRequest(path, method)(`${config.apiUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        [TRACE_HEADER]: traceId,
        ...(operationKey ? { "Idempotency-Key": operationKey } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });

  const session = await readSession();
  assertSessionRevision(revision);
  if (expectedOwner && offlineOwner(session, config.apiUrl) !== expectedOwner) {
    throw new ApiError("Nalog za slanje je promenjen. Zahtev nije poslat pod novim nalogom.", 401);
  }
  let response: Response;
  try {
    response = await run(session?.token);
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0, true);
  }

  if (!allowOldAcknowledgement) assertSessionRevision(revision);
  if (response.status === 401 && session?.refreshToken) {
    assertSessionRevision(revision);
    const nextToken = await refreshToken(traceId, session);
    if (!nextToken) {
      throw new ApiError("Sesija je istekla. Prijavite se ponovo.", 401);
    }
    const refreshedSession = await readSession();
    if (refreshedSession?.token !== nextToken || offlineOwner(refreshedSession, config.apiUrl) !== offlineOwner(session, config.apiUrl)) {
      throw new ApiError("Sesija za slanje je promenjena.", 401);
    }
    assertSessionRevision(revision);
    try {
      response = await run(nextToken);
    } catch {
      throw new ApiError(NETWORK_ERROR_MESSAGE, 0, true);
    }
  }

  onStatus(response.status);
  if (!allowOldAcknowledgement) assertSessionRevision(revision);
  if (!response.ok) {
    const rawText = await response.text();
    if (!allowOldAcknowledgement) assertSessionRevision(revision);
    let backendMessage: string | undefined;

    try {
      const parsed = JSON.parse(rawText) as { error?: unknown; message?: unknown };
      if (typeof parsed.error === "string") backendMessage = parsed.error;
      else if (typeof parsed.message === "string") backendMessage = parsed.message;
    } catch {
      // Body nije JSON — koristimo srpsku poruku po statusu.
    }

    if (backendMessage && /account\s*inactive/i.test(backendMessage)) {
      const activeSession = await readSession();
      if (activeSession?.refreshToken === session?.refreshToken && offlineOwner(activeSession, config.apiUrl) === offlineOwner(session, config.apiUrl)) {
        accountInactiveHandler?.();
      }
      throw new ApiError("Vaš nalog je neaktivan. Obratite se administratoru firme.", response.status, false, true);
    }

    const message = isMeaningfulBackendMessage(backendMessage)
      ? (backendMessage as string)
      : serbianMessageForStatus(response.status);

    const error = new ApiError(message, response.status);
    if (response.status === 429) {
      const retryAfter = response.headers?.get?.("Retry-After");
      const seconds = retryAfter?.trim() ? Number(retryAfter) : NaN;
      const deadline = retryAfter ? Date.parse(retryAfter) : NaN;
      error.retryAfterMs = Number.isFinite(seconds) && seconds >= 0 ? Math.max(1000, seconds * 1000)
        : Number.isFinite(deadline) && deadline > Date.now() ? deadline - Date.now() : 60_000;
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let result: T;
  try { result = (await response.json()) as T; }
  catch (error) {
    if (operationKey) throw new ApiError("Nismo dobili ispravnu potvrdu čuvanja.", 0, true);
    throw error;
  }
  if (!allowOldAcknowledgement) assertSessionRevision(revision);
  return result;
}

async function request<T>(method: HttpMethod, path: string, body?: unknown, suppliedTraceId?: string, expectedOwner?: string, allowOldAcknowledgement = false, operationKey?: string): Promise<T> {
  const revision = getSessionRevision();
  const traceId = isTraceId(suppliedTraceId) ? suppliedTraceId : newTraceId();
  const operation = requestOperation(path); const start = Date.now();
  let status: number | undefined;
  mobileDiagnostic("debug", "request.started", { traceId, operation, method });
  try {
    const result = await requestUntraced<T>(method, path, body, traceId, value => { status = value; }, expectedOwner, revision, allowOldAcknowledgement, operationKey);
    mobileDiagnostic("info", "request.completed", { traceId, operation, method, status, durationMs: Date.now() - start });
    return result;
  } catch (error) {
    mobileDiagnostic("warn", "request.failed", { traceId, operation, method, status: error instanceof ApiError || error instanceof SessionChangedError ? error.status : undefined, durationMs: Date.now() - start, errorKind: error instanceof ApiError && error.isNetwork ? "network" : "unexpected" });
    throw error;
  }
}

async function requestNoContent(method: HttpMethod, path: string, body?: unknown, traceId?: string, expectedOwner?: string): Promise<void> {
  await request<unknown>(method, path, body, traceId, expectedOwner, true);
}

async function flushQueuedWritesInternal(): Promise<void> {
  await flushOfflineWriteQueue(async (item: OfflineWriteItem) => {
    const traceId = isTraceId(item.traceId) ? item.traceId : newTraceId();
    const operation = requestOperation(item.path);
    mobileDiagnostic("debug", "queue.sending", { traceId, operation, method: item.method, attempt: item.retries + 1 });
    try {
      if (item.method === "POST" && item.path === "/api/documents") {
        if (!isTraceId(item.operationKey)) throw new ApiError("Stariji zahtev nema ključ za bezbedno ponavljanje. Proverite listu dokumenata pre novog dodavanja.", 409);
        const result = await request<{ ok?: boolean; data?: { id?: string } }>(item.method, item.path, item.body, traceId, item.owner, true, item.operationKey);
        if (result?.ok !== true || typeof result.data?.id !== "string" || !result.data.id) {
          throw new ApiError("Nismo dobili ispravnu potvrdu čuvanja.", 0, true);
        }
        const attempt = documentAttempts.get(item.operationKey);
        if (attempt) { attempt.data = result; attempt.acknowledged = true; }
      } else if (item.method === "POST" && isStopMovement(item.path, item.body)) {
        const result = await request<{ ok?: boolean; data?: { routeStop?: { id?: string; status?: string } } }>(item.method, item.path, item.body, traceId, item.owner, true);
        const stop = result?.data?.routeStop;
        if (result?.ok !== true || stop?.id !== stopIdFromPath(item.path) || !["ARRIVED", "DEPARTED", "CANCELED"].includes(stop?.status ?? "") || ((item.body as { action: string }).action === "DEPARTED" && stop?.status === "ARRIVED")) throw new ApiError("Nismo dobili ispravnu potvrdu stanice.", 0, true);
        await acknowledgeStopAction(item, stop!.status!);
        const attempt = item.operationKey ? stationAttempts.get(item.operationKey) : undefined;
        if (attempt) { attempt.data = result; attempt.acknowledged = true; }
      } else {
        await requestNoContent(item.method, item.path, item.body, traceId, item.owner);
      }
      mobileDiagnostic("info", "queue.acknowledged", { traceId, operation, method: item.method });
    } catch (error) {
      mobileDiagnostic("warn", "queue.rejected", { traceId, operation, method: item.method, status: error instanceof ApiError || error instanceof SessionChangedError ? error.status : undefined });
      throw error;
    }
  });
  void reportGpsQueueSnapshot(getOfflineWriteQueue);
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

async function sendPersistedDocument<T>(item: OfflineWriteItem, attempt: { data?: unknown; acknowledged?: boolean }): Promise<QueuedResult<T>> {
  let noticeScheduled = false;
  try {
    await flushQueuedWritesInternal();
    noticeScheduled = Boolean(attempt.acknowledged);
  } catch {
    // A failed acknowledgement persistence cannot erase the durable operation nonce.
  }
  if (attempt.acknowledged) return { queued: false, data: attempt.data as T, noticeScheduled };
  const current = await getOfflineWriteQueue().then(items => items.find(entry => entry.id === item.id)).catch(() => undefined);
  return { queued: true, data: null, delivery: current?.blocked ? "blocked" : "pending",
    message: current?.blocked ? current.failureMessage || "Zahtev nije prihvaćen. Proverite podatke i pokušajte ponovo." : DOCUMENT_PENDING_MESSAGE };
}

async function writeDocument<T>(body: unknown, traceId: string, owner: string, revision: number): Promise<QueuedResult<T>> {
  const operationKey = newTraceId();
  const attempt = {};
  documentAttempts.set(operationKey, attempt);
  try {
    let item: OfflineWriteItem;
    try { item = await enqueueOfflineWrite({ method: "POST", path: "/api/documents", body, traceId, operationKey }, owner); }
    catch { throw new ApiError("Zahtev nije sačuvan na uređaju i nije poslat serveru. Pokušajte ponovo.", 0); }
    mobileDiagnostic("info", "queue.stored", { traceId, operation: "documents", method: "POST" });
    assertSessionRevision(revision);
    const result = await sendPersistedDocument<T>(item, attempt);
    assertSessionRevision(revision);
    return result;
  } finally { documentAttempts.delete(operationKey); }
}

async function retryDocument(id: string): Promise<QueuedResult<unknown>> {
  const revision = getSessionRevision();
  const owner = offlineOwner(await readSession(), config.apiUrl);
  assertSessionRevision(revision);
  if (!owner) throw new ApiError("Za slanje zahteva potrebna je prijava.", 401);
  const item = (await getOfflineWriteQueue()).find(entry => entry.id === id);
  if (!item || !isTraceId(item.operationKey)) throw new ApiError("Zahtev nije dostupan za bezbedno ponavljanje. Proverite listu dokumenata.", 409);
  const attempt = {};
  documentAttempts.set(item.operationKey, attempt);
  try {
    await retryOfflineDocument(id, owner);
    assertSessionRevision(revision);
    const result = await sendPersistedDocument(item, attempt);
    assertSessionRevision(revision);
    return result;
  } finally { documentAttempts.delete(item.operationKey); }
}

async function sendStation<T>(item: OfflineWriteItem, attempt: { data?: unknown; acknowledged?: boolean }): Promise<QueuedResult<T>> {
  try { await flushQueuedWritesInternal(); } catch { /* Durable request remains locked until acknowledgement. */ }
  if (attempt.acknowledged) return { queued: false, data: attempt.data as T };
  const current = (await getOfflineWriteQueue()).find(entry => entry.id === item.id);
  return { queued: true, data: null, delivery: current?.blocked ? "blocked" : "pending", message: current?.failureMessage };
}
async function writeStation<T>(path: string, body: unknown, traceId: string, owner: string, revision: number): Promise<QueuedResult<T>> {
  const operationKey = newTraceId(); const attempt = {}; stationAttempts.set(operationKey, attempt);
  try {
    let item: OfflineWriteItem;
    try { item = await enqueueOfflineWrite({ method: "POST", path, body, traceId, operationKey }, owner); }
    catch (error) {
      const message = typeof (error as { message?: unknown })?.message === "string" ? (error as { message: string }).message : "";
      if (/već čeka|već potvrđena/.test(message)) throw new ApiError(message, 409);
      throw new ApiError("Zahtev nije sačuvan na uređaju i nije poslat serveru. Pokušajte ponovo.", 0);
    }
    assertSessionRevision(revision);
    const result = await sendStation<T>(item, attempt); assertSessionRevision(revision); return result;
  } finally { stationAttempts.delete(operationKey); }
}
async function retryStation(id: string): Promise<QueuedResult<unknown>> {
  const revision = getSessionRevision(); const owner = offlineOwner(await readSession(), config.apiUrl); assertSessionRevision(revision);
  if (!owner) throw new ApiError("Potrebna je prijava.", 401);
  const item = await retryOfflineStop(id, owner, newTraceId()); assertSessionRevision(revision); const key = item.operationKey!; const attempt = {}; stationAttempts.set(key, attempt);
  try { const result = await sendStation(item, attempt); assertSessionRevision(revision); return result; }
  finally { stationAttempts.delete(key); }
}
async function dismissStation(id: string): Promise<void> {
  const revision = getSessionRevision(); const owner = offlineOwner(await readSession(), config.apiUrl); assertSessionRevision(revision);
  if (!owner) throw new ApiError("Potrebna je prijava.", 401);
  await dismissRejectedStop(id, owner); assertSessionRevision(revision);
}

async function writeQueued<T>(method: OfflineWriteMethod, path: string, body?: unknown, requiredOwner?: string): Promise<QueuedResult<T>> {
  const revision = getSessionRevision();
  const traceId = newTraceId();
  const owner = offlineOwner(await readSession(), config.apiUrl);
  assertSessionRevision(revision);
  if (requiredOwner && owner !== requiredOwner) throw new SessionChangedError();
  if (!owner) throw new ApiError("Za slanje zahteva potrebna je prijava.", 401);
  if (method === "POST" && path === "/api/documents") return writeDocument<T>(body, traceId, owner, revision);
  if (method === "POST" && isStopMovement(path, body)) return writeStation<T>(path, body, traceId, owner, revision);
  if (method === "POST" && path === "/api/gps-logs") {
    const item = await enqueueOfflineWrite({ method, path, body, traceId }, owner);
    mobileDiagnostic("info", "queue.stored", { traceId, operation: "gps", method });
    void reportGpsQueueSnapshot(getOfflineWriteQueue);
    assertSessionRevision(revision);
    await flushQueuedWritesInternal();
    assertSessionRevision(revision);
    const pending = (await getOfflineWriteQueue()).some(entry => entry.id === item.id);
    return pending ? { queued: true, data: null } : { queued: false, data: null as T };
  }
  try {
    const data = await request<T>(method, path, body, traceId, owner);
    scheduleQueueFlush();
    return { queued: false, data };
  } catch (error) {
    if (!isLikelyOfflineError(error)) {
      throw error;
    }

    await enqueueOfflineWrite({ method, path, body, traceId }, owner);
    mobileDiagnostic("info", "queue.stored", { traceId, operation: requestOperation(path), method });
    return { queued: true, data: null };
  }
}

export const api = {
  retryDocument,
  retryStation,
  dismissStation,
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  postForOwner: <T>(path: string, body: unknown, owner: string) => request<T>("POST", path, body, undefined, owner),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  postQueued: <T>(path: string, body?: unknown) => writeQueued<T>("POST", path, body),
  postQueuedForOwner: <T>(path: string, body: unknown, owner: string) => writeQueued<T>("POST", path, body, owner),
  patchQueued: <T>(path: string, body?: unknown) => writeQueued<T>("PATCH", path, body),
  deleteQueued: <T>(path: string) => writeQueued<T>("DELETE", path),
  flushOfflineWrites: async () => {
    await flushQueuedWritesInternal();
  }
};

