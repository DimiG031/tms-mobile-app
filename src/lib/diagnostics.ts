import { config } from "@/lib/config";
import { newTraceId, requestOperation, TRACE_HEADER } from "./diagnostics-core";
import { diagnosticLevel, emitDiagnostic, type DiagnosticEvent, type DiagnosticFields } from "./diagnostics-core";
export { isTraceId, newTraceId, requestOperation, TRACE_HEADER } from "./diagnostics-core";
export function mobileDiagnostic(level: "debug" | "info" | "warn" | "error", event: DiagnosticEvent, fields: DiagnosticFields = {}) {
  const minimum = diagnosticLevel(process.env.EXPO_PUBLIC_TMS_LOG_LEVEL, __DEV__ ? "debug" : "off");
  emitDiagnostic("mobile", minimum, level, event, fields);
}

/** For direct login/presign calls outside api.ts; never use for signed storage URLs. */
export async function diagnosticMobileFetch(path: string, init?: RequestInit): Promise<Response> {
  const traceId = newTraceId(); const start = Date.now(); const operation = requestOperation(path);
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers); headers.set(TRACE_HEADER, traceId);
  mobileDiagnostic("debug", "request.started", { traceId, operation, method });
  try {
    const response = await fetch(`${config.apiUrl}${path}`, { ...init, headers });
    mobileDiagnostic(response.ok ? "info" : "warn", "request.completed", { traceId, operation, method, status: response.status, durationMs: Date.now() - start });
    return response;
  } catch (error) {
    mobileDiagnostic("warn", "request.failed", { traceId, operation, method, durationMs: Date.now() - start, errorKind: "network" });
    throw error;
  }
}
