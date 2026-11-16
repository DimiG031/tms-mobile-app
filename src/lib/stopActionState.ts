export type StopMovement = "ARRIVED" | "DEPARTED";
export function isStopActionPath(path: string): boolean { return /^\/api\/mobile\/route-stops\/[^/]+\/actions$/.test(path); }
export function isStopMovement(path: string, body: unknown): boolean {
  return isStopActionPath(path) && Boolean(body && typeof body === "object" && ["ARRIVED", "DEPARTED"].includes(String((body as { action?: string }).action)));
}
export function stopIdFromPath(path: string): string | null {
  if (!isStopActionPath(path)) return null;
  try { return decodeURIComponent(path.split("/")[4]); } catch { return null; }
}
export function stopRank(status?: string | null): number {
  return ({ PLANNED: 0, ARRIVED: 1, DEPARTED: 2, COMPLETED: 2, CANCELED: 3, CANCELLED: 3 } as Record<string, number>)[status?.toUpperCase() ?? ""] ?? -1;
}
export function stopActionState(serverStatus?: string | null, confirmedStatus?: string | null, pending = false) {
  const status = stopRank(confirmedStatus) > stopRank(serverStatus) ? confirmedStatus?.toUpperCase() : serverStatus?.toUpperCase();
  return { status, canArrive: !pending && status === "PLANNED", canDepart: !pending && status === "ARRIVED", finished: stopRank(status) >= 2 };
}
