import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { usePathname, useRouter } from "expo-router";
import { hasStoredSession, mobileLogin, mobileLogout, unlockWithBiometrics as biometricUnlock } from "@/services/auth";
import { readSession } from "@/lib/secure-store";
import { api, setAccountInactiveHandler } from "@/lib/api";
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
  const [isHydrating, setIsHydrating] = useState(true);
  const [hasBiometricSession, setHasBiometricSession] = useState(false);
  const [inactive, setInactive] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Kad bilo koja zaštićena ruta vrati "AccountInactive" → prikaži blok-ekran.
  useEffect(() => {
    setAccountInactiveHandler(() => setInactive(true));
    return () => setAccountInactiveHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const existing = await readSession();
        const canBiometricUnlock = await hasStoredSession();
        setSession(existing);
        setHasBiometricSession(canBiometricUnlock);
        setInactive(existing?.user.active === false);
      } catch {
        // Prevent permanent blank screen when secure storage is unavailable.
        setSession(null);
        setHasBiometricSession(false);
      } finally {
        setIsHydrating(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await mobileLogin(email, password);
    setSession(next);
    setHasBiometricSession(true);
    setInactive(next.user.active === false);
  }, []);

  const signOut = useCallback(async () => {
    const current = await readSession();

    await stopGpsTracking();

    if (current?.user.id) {
      try {
        await unregisterPushTokenForUser(current.user.id);
      } catch {
        // If this fails, local logout should still continue.
      }
    }

    await mobileLogout();
    setSession(null);
    setHasBiometricSession(false);
    setInactive(false);
    router.replace("/login");
  }, [router]);

  const unlockWithBiometrics = useCallback(async () => {
    const next = await biometricUnlock();
    if (!next) return false;
    setSession(next);
    setInactive(next.user.active === false);
    return true;
  }, []);

  // „Osveži" na blok-ekranu: proveri da li je admin aktivirao nalog.
  const recheckActivation = useCallback(async () => {
    try {
      await api.get("/api/mobile/profile");
      setInactive(false);
    } catch {
      // I dalje neaktivan (AccountInactive) ili mrežna greška — ostajemo na blok-ekranu.
    }
  }, []);

  useEffect(() => {
    if (isHydrating) return;

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
  }, [isHydrating, pathname, router, session, inactive]);

  useEffect(() => {
    if (!session?.user.id) return;

    let isMounted = true;

    const run = async () => {
      try {
        await registerPushTokenForUser(session.user.id);
      } catch {
        // Endpoint might not be available yet on all backend environments.
      }
    };

    void run();

    const tokenSub = addPushTokenListener((token) => {
      if (!isMounted) return;
      void syncPushTokenForUser(session.user.id, token).catch(() => {
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
      isHydrating,
      isAuthenticated: Boolean(session),
      hasBiometricSession,
      inactive,
      signIn,
      signOut,
      unlockWithBiometrics,
      recheckActivation
    }),
    [hasBiometricSession, inactive, isHydrating, recheckActivation, session, signIn, signOut, unlockWithBiometrics]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
