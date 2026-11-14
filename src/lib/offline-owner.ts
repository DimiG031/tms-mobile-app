/** Storage namespace only. Never contains credentials and never grants API access. */
export function offlineOwner(session: unknown, apiUrl: string): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as { user?: unknown }).user;
  if (!user || typeof user !== "object") return null;
  const { id, companyId, driverId } = user as Record<string, unknown>;
  if (typeof id !== "string" || !id || typeof companyId !== "string" || !companyId) return null;
  if (driverId != null && typeof driverId !== "string") return null;
  return JSON.stringify([apiUrl.replace(/\/$/, ""), id, companyId, driverId ?? null]);
}
