import { offlineOwner } from "@/lib/offline-owner";

export function queryScopeOwner(session: unknown, apiUrl: string): string | null {
  const owner = offlineOwner(session, apiUrl);
  if (!owner) return null;
  const user = (session as {user: {role?: unknown}}).user;
  return JSON.stringify([owner, typeof user.role === "string" ? user.role : null]);
}
export type QueryStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<unknown>;
};
export function queryCacheKey(owner: string): string {
  return `tms-query-cache-v3:${encodeURIComponent(owner)}`;
}
/** A retired provider cannot restore/persist data after its session boundary. */
export function scopedQueryStorage(storage: QueryStorage, active: () => boolean) {
  return {
    getItem: async (key: string) => {
      if (!active()) return null;
      const value = await storage.getItem(key);
      return active() ? value : null;
    },
    setItem: async (key: string, value: string) => { if (active()) await storage.setItem(key, value); },
    removeItem: async (key: string) => { if (active()) await storage.removeItem(key); }
  };
}
