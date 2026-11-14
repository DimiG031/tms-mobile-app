import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { usePathname, useRouter, useRootNavigationState } from "expo-router";
import { mobileLogin, mobileLogout, unlockWithBiometrics as biometricUnlock } from "@/services/auth";
import { readSession, getSessionSnapshot, subscribeSessionChanges, getSessionRevision, assertSessionRevision, replaceSessionIfCurrent } from "@/lib/secure-store";
import { api, setAccountInactiveHandler } from "@/lib/api";
import { config } from "@/lib/config";
import { offlineOwner } from "@/lib/offline-owner";
import type { AuthSession } from "@/lib/types";
import { stopGpsTracking } from "@/services/gpsTracking";
import {
  addPushTokenListener,
  registerPushTokenForUser,
  syncPushTokenForUser,
  unregisterPushTokenForUser
} from "@/services/notifications";

type AuthContextValue = {
  session: AuthSession | null;
  sessionRevision: number;
  isHydrating: boolean;
  isAuthenticated: boolean;
  hasBiometricSession: boolean;
  inactive: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  recheckActivation: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionRevision, setSessionRevision] = useState(0);
  const [isHydrating, setIsHydrating] = useState(true);
  const [hasBiometricSession, setHasBiometricSession] = useState(false);
  const [inactive, setInactive] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const navigation = useRootNavigationState();

  // Kad bilo koja zaštićena ruta vrati "AccountInactive" → prikaži blok-ekran.
  useEffect(() => {
    setAccountInactiveHandler(() => setInactive(true));
    return () => setAccountInactiveHandler(null);
  }, []);

  useEffect(() => {
    let active = true;
    let appliedRevision: number | undefined;
    const apply = (next: AuthSession | null, revision: number) => {
      if (!active) return;
      setSession(next);
      setSessionRevision(revision);
      setHasBiometricSession(Boolean(next?.token && next?.refreshToken));
      if (appliedRevision !== revision) setInactive(next?.user.active === false);
      appliedRevision = revision;
    };
    const unsubscribe = subscribeSessionChanges(apply);
    void readSession().then(() => {
      const current = getSessionSnapshot();
      apply(current.session, current.revision);
    }).catch(() => { apply(null, getSessionSnapshot().revision); })
      .finally(() => { if (active) setIsHydrating(false); });
    return () => { active = false; unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await mobileLogin(email, password);
  }, []);

  const signOut = useCallback(async () => {
    const current = getSessionSnapshot().session;
    // Best-effort server/native cleanup must never hold the old UI/session open.
    if (current?.user.id) void unregisterPushTokenForUser(current.user.id, current.token).catch(() => undefined);
    await mobileLogout();
    void stopGpsTracking(offlineOwner(current, config.apiUrl) ?? undefined).catch(() => undefined);
  }, []);

  const unlockWithBiometrics = useCallback(async () => {
    const next = await biometricUnlock();
    return Boolean(next);
  }, []);

  // „Osveži" na blok-ekranu: proveri da li je admin aktivirao nalog.
  const recheckActivation = useCallback(async () => {
    try {
      const revision = getSessionRevision();
      await api.get("/api/mobile/profile");
      assertSessionRevision(revision);
      const current = await readSession();
      assertSessionRevision(revision);
      if (current && await replaceSessionIfCurrent(current, { ...current, user: { ...current.user, active: true } })) setInactive(false);
    } catch {
      // I dalje neaktivan (AccountInactive) ili mrežna greška — ostajemo na blok-ekranu.
    }
  }, []);

  useEffect(() => {
    if (isHydrating || !navigation?.key) return;

    const isInAuth =
      pathname.startsWith("/(auth)") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/forgot-password");
    const onInactive = pathname.startsWith("/inactive");

    if (!session) {
      if (!isInAuth) router.replace("/login");
      return;
    }

    if (inactive) {
      if (!onInactive) router.replace("/inactive");
      return;
    }

    if (isInAuth || onInactive) {
      router.replace("/(driver)");
    }
  }, [isHydrating, navigation?.key, pathname, router, session, inactive]);

  useEffect(() => {
    if (!session?.user.id) return;

    let isMounted = true;

    const run = async () => {
      try {
        await registerPushTokenForUser(session.user.id, offlineOwner(session, config.apiUrl) ?? undefined);
      } catch {
        // Endpoint might not be available yet on all backend environments.
      }
    };

    void run();

    const tokenSub = addPushTokenListener((token) => {
      if (!isMounted) return;
      void syncPushTokenForUser(session.user.id, token, offlineOwner(session, config.apiUrl) ?? undefined).catch(() => {
        // Silent fail, next token event or login refresh will retry.
      });
    });

    return () => {
      isMounted = false;
      tokenSub?.remove();
    };
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      sessionRevision,
      isHydrating,
      isAuthenticated: Boolean(session),
      hasBiometricSession,
      inactive,
      signIn,
      signOut,
      unlockWithBiometrics,
      recheckActivation
    }),
    [hasBiometricSession, inactive, isHydrating, recheckActivation, session, signIn, signOut, unlockWithBiometrics, sessionRevision]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

