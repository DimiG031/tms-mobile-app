import * as SecureStore from "expo-secure-store";
import type { AuthSession } from "@/lib/types";

const SESSION_KEY = "auth_session_v1";
let sessionTail: Promise<unknown> = Promise.resolve();
function sessionLock<T>(work: () => Promise<T>): Promise<T> {
  const result = sessionTail.then(work);
  sessionTail = result.catch(() => undefined);
  return result;
}
async function readRaw(): Promise<AuthSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthSession; }
  catch { return null; }
}
export function readSession(): Promise<AuthSession | null> {
  return sessionLock(readRaw);
}
export function saveSession(session: AuthSession): Promise<void> {
  return sessionLock(() => SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session)));
}
export function clearSession(): Promise<void> {
  return sessionLock(() => SecureStore.deleteItemAsync(SESSION_KEY));
}
/** A late refresh may neither replace nor delete a subsequent login. */
export function replaceSessionIfCurrent(expected: AuthSession, next: AuthSession | null): Promise<boolean> {
  return sessionLock(async () => {
    const current = await readRaw();
    if (!current || current.token !== expected.token || current.refreshToken !== expected.refreshToken ||
        current.user.id !== expected.user.id || current.user.companyId !== expected.user.companyId ||
        current.user.driverId !== expected.user.driverId) return false;
    if (next) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(next));
    else await SecureStore.deleteItemAsync(SESSION_KEY);
    return true;
  });
}
