import { diagnosticMobileFetch } from "@/lib/diagnostics";
import * as LocalAuthentication from "expo-local-authentication";
import { clearSession, readSession, beginSessionChange, saveSessionForIntent, getSessionRevision, SessionChangedError } from "@/lib/secure-store";
import type { AuthSession, MobileLoginResponse } from "@/lib/types";

type ErrorPayload = {
  error?: string;
  message?: string;
};

function extractErrorMessage(payload: ErrorPayload | null, fallback: string): string {
  return payload?.error || payload?.message || fallback;
}

export async function mobileLogin(email: string, password: string): Promise<AuthSession> {
  const intent = beginSessionChange();
  const response = await diagnosticMobileFetch("/api/auth/mobile-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as ErrorPayload | null;
    throw new Error(extractErrorMessage(errorPayload, "Neispravni kredencijali"));
  }

  const payload = (await response.json()) as MobileLoginResponse;
  const session: AuthSession = {
    token: payload.data.token,
    refreshToken: payload.data.refreshToken,
    user: payload.data.user
  };

  if (!(await saveSessionForIntent(session, intent))) throw new SessionChangedError();
  return session;
}

export async function mobileLogout(): Promise<void> {
  await clearSession();
}

export async function unlockWithBiometrics(): Promise<AuthSession | null> {
  const revision = getSessionRevision();
  const stored = await readSession();
  if (!stored) return null;

  const isAvailable = await LocalAuthentication.hasHardwareAsync();
  const canEnroll = await LocalAuthentication.isEnrolledAsync();
  if (!isAvailable || !canEnroll) return null;

  const auth = await LocalAuthentication.authenticateAsync({
    promptMessage: "Otključajte TMS aplikaciju",
    fallbackLabel: "Koristi šifru"
  });
  if (getSessionRevision() !== revision) throw new SessionChangedError();
  if (!auth.success) return null;
  const current = await readSession();
  return current?.refreshToken === stored.refreshToken && getSessionRevision() === revision ? current : null;
}

export async function hasStoredSession(): Promise<boolean> {
  const session = await readSession();
  return Boolean(session?.token && session?.refreshToken);
}

