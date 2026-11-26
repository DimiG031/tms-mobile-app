/** Safe-by-construction diagnostics. Never pass payloads, URLs or Error objects to a sink. */
export const TRACE_HEADER = "x-tms-trace-id";
export type DiagnosticLevel = "debug" | "info" | "warn" | "error" | "off";
export type DiagnosticEvent =
  | "request.started" | "request.completed" | "request.failed"
  | "refresh.started" | "refresh.completed" | "refresh.failed"
  | "queue.stored" | "queue.sending" | "queue.acknowledged" | "queue.rejected" | "queue.snapshot"
  | "operation.started" | "operation.completed" | "operation.failed";
export type DiagnosticFields = {
  traceId?: string;
  operation?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  attempt?: number;
  gpsPending?: number;
  invalidMeasurementTimes?: number;
  oldestMeasurementAt?: string;
  newestMeasurementAt?: string;
  oldestQueuedAt?: string;
  newestQueuedAt?: string;
  errorKind?: "network" | "aborted" | "unexpected";
};
const events: ReadonlySet<string> = new Set<DiagnosticEvent>([
  "request.started", "request.completed", "request.failed", "refresh.started", "refresh.completed", "refresh.failed",
  "queue.stored", "queue.sending", "queue.acknowledged", "queue.rejected", "queue.snapshot",
  "operation.started", "operation.completed", "operation.failed",
]);
const ranks = { debug: 0, info: 1, warn: 2, error: 3, off: 4 } as const;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function isTraceId(value: unknown): value is string { return typeof value === "string" && uuid.test(value); }
export function newTraceId(): string {
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch { /* RN fallback: correlation only, never authentication. */ }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16); return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}
export function diagnosticLevel(value: unknown, fallback: DiagnosticLevel): DiagnosticLevel {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ranks, value) ? value as DiagnosticLevel : fallback;
}
/** Operation labels must come from code, not user input. Runtime validation is defense in depth. */
export function diagnosticRecord(layer: "api" | "web" | "mobile", event: DiagnosticEvent, fields: DiagnosticFields = {}) {
  if (!events.has(event)) return null;
  const safe: Record<string, string | number> = { timestamp: new Date().toISOString(), layer, event };
  if (isTraceId(fields.traceId)) safe.traceId = fields.traceId;
  if (typeof fields.operation === "string" && /^[a-z][a-z0-9.]{0,79}$/.test(fields.operation)) safe.operation = fields.operation;
  if (typeof fields.method === "string" && /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(fields.method)) safe.method = fields.method;
  for (const key of ["status", "durationMs", "attempt"] as const) {
    const v = fields[key]; if (typeof v === "number" && Number.isFinite(v) && v >= 0) safe[key] = Math.round(v);
  }
  if (fields.errorKind === "network" || fields.errorKind === "aborted" || fields.errorKind === "unexpected") safe.errorKind = fields.errorKind;
  if (event === "queue.snapshot" && fields.operation === "gps") {
    for (const key of ["gpsPending", "invalidMeasurementTimes"] as const) {
      const value = fields[key];
      if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) safe[key] = value;
    }
    for (const key of ["oldestMeasurementAt", "newestMeasurementAt", "oldestQueuedAt", "newestQueuedAt"] as const) {
      const value = fields[key];
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
          Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value) safe[key] = value;
    }
  }
  return safe;
}
export function emitDiagnostic(layer: "api" | "web" | "mobile", minimum: DiagnosticLevel, level: Exclude<DiagnosticLevel, "off">, event: DiagnosticEvent, fields: DiagnosticFields = {}) {
  if (ranks[level] < ranks[minimum]) return;
  try {
    const record = diagnosticRecord(layer, event, fields); if (!record) return;
    const line = JSON.stringify({ ...record, level });
    if (level === "error") console.error(line); else if (level === "warn") console.warn(line); else console.info(line);
  } catch { /* Diagnostics must never alter a business outcome. */ }
}
/** Small fixed vocabulary: dynamic IDs and all query strings are deliberately omitted. */
export function requestOperation(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0];
  const known: Array<[RegExp, string]> = [
    [/^\/api\/upload\/presign$/, "upload.presign"],
    [/^\/api\/auth\/mobile-login$/, "auth.login"], [/^\/api\/auth\/mobile-refresh$/, "auth.refresh"],
    [/^\/api\/drivers(?:\/|$)/, "drivers"], [/^\/api\/mobile\/travel-orders(?:\/|$)/, "travelorders"],
    [/^\/api\/mobile\/tours(?:\/|$)/, "tours"], [/^\/api\/tours(?:\/|$)/, "tours"],
    [/^\/api\/(?:mobile\/)?(?:profile|driver-profile)(?:\/|$)/, "profile"],
    [/^\/api\/documents(?:\/|$)/, "documents"], [/^\/api\/files(?:\/|$)/, "files"],
    [/^\/api\/gps-logs(?:\/|$)/, "gps"], [/^\/api\/chat(?:\/|$)/, "chat"],
    [/^\/api\/notifications(?:\/|$)/, "notifications"], [/^\/api\/mobile\/sos$/, "sos"],
  ];
  return known.find(([pattern]) => pattern.test(pathname))?.[1] ?? "api.other";
}
