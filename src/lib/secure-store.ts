import * as SecureStore from "expo-secure-store";
import type { AuthSession } from "@/lib/types";

const SESSION_KEY = "auth_session_v1";
let sessionTail: Promise<unknown> = Promise.resolve();
let observed: AuthSession | null | undefined;
let revision = 0;
let authIntent = 0;
let locallySignedOut = false;
const listeners = new Set<(session: AuthSession | null, revision: number) => void>();
function sameBoundary(a: AuthSession | null, b: AuthSession | null): boolean {
  if (!a || !b) return a === b;
  return a.refreshToken === b.refreshToken && a.user.id === b.user.id &&
    a.user.companyId === b.user.companyId && a.user.driverId === b.user.driverId &&
    a.user.role === b.user.role && a.user.active === b.user.active;
}
function publish(next: AuthSession | null): void {
  if (observed !== undefined && !sameBoundary(observed, next)) revision++;
  observed = next;
  for (const listener of listeners) {
    try { listener(next, revision); } catch { /* Storage commit must not fail on a view. */ }
  }
}
export class SessionChangedError extends Error {
  readonly status = 401;
  readonly isNetwork = false;
  constructor() { super("Sesija je promenjena. Zahtev prethodne sesije je zanemaren."); this.name = "SessionChangedError"; }
}
export function getSessionRevision(): number { return revision; }
export function assertSessionRevision(expected: number): void {
  if (revision !== expected) throw new SessionChangedError();
}
export function getSessionSnapshot(): { session: AuthSession | null; revision: number } {
  return { session: observed ?? null, revision };
}
export function subscribeSessionChanges(listener: (session: AuthSession | null, revision: number) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function beginSessionChange(): number { return ++authIntent; }
function sessionLock<T>(work: () => Promise<T>): Promise<T> {
  const result = sessionTail.then(work);
  sessionTail = result.catch(() => undefined);
  return result;
}
function validSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as { token?: unknown; refreshToken?: unknown; user?: Record<string, unknown> };
  const user = s.user;
  return typeof s.token === "string" && Boolean(s.token) && typeof s.refreshToken === "string" && Boolean(s.refreshToken) &&
    Boolean(user && typeof user === "object" && !Array.isArray(user) && typeof user.id === "string" && user.id &&
      typeof user.companyId === "string" && (user.driverId == null || typeof user.driverId === "string") &&
      (user.role == null || typeof user.role === "string") && (user.active == null || typeof user.active === "boolean"));
}
async function readRaw(): Promise<AuthSession | null> {
  if (locallySignedOut) return null;
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (locallySignedOut) return null;
  if (!raw) return null;
  try { const value: unknown = JSON.parse(raw); return validSession(value) ? value : null; }
  catch { return null; }
}
function observe(next: AuthSession | null): void {
  if (observed === undefined || JSON.stringify(observed) !== JSON.stringify(next)) publish(next);
}
async function writeRaw(next: AuthSession | null): Promise<void> {
  if (next && !validSession(next)) throw new Error("Odgovor za prijavu nije ispravan. Pokušaj ponovo.");
  if (next) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(next));
  else await SecureStore.deleteItemAsync(SESSION_KEY);
}
export function readSession(): Promise<AuthSession | null> {
  return sessionLock(async () => { const next = await readRaw(); observe(next); return next; });
}
export async function saveSession(session: AuthSession): Promise<void> {
  if (!(await saveSessionForIntent(session, beginSessionChange()))) throw new SessionChangedError();
}
export function saveSessionForIntent(session: AuthSession, intent: number): Promise<boolean> {
  return sessionLock(async () => {
    if (intent !== authIntent) return false;
    const before = await readRaw(); observe(before);
    await writeRaw(session);
    if (intent !== authIntent) { await writeRaw(locallySignedOut ? null : before); return false; }
    locallySignedOut = false;
    publish(session);
    return true;
  });
}
export function clearSession(): Promise<void> {
  authIntent++;
  locallySignedOut = true;
  publish(null);
  return sessionLock(() => writeRaw(null));
}
/** A late refresh may neither replace nor delete a subsequent login. */
export function replaceSessionIfCurrent(expected: AuthSession, next: AuthSession | null): Promise<boolean> {
  return sessionLock(async () => {
    const current = await readRaw(); observe(current);
    if (!current || current.token !== expected.token || current.refreshToken !== expected.refreshToken ||
        current.user.id !== expected.user.id || current.user.companyId !== expected.user.companyId ||
        current.user.driverId !== expected.user.driverId) return false;
    if (!next) {
      locallySignedOut = true;
      publish(null);
      await writeRaw(null);
      return true;
    }
    const intent = authIntent;
    await writeRaw(next);
    if (locallySignedOut || intent !== authIntent) {
      await writeRaw(locallySignedOut ? null : current);
      return false;
    }
    publish(next);
    return true;
  });
}
