import "../global.css";
import "@/background/gpsTask";

import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Alert, AppState } from "react-native";
import { Slot, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { api } from "@/lib/api";
import { getSessionRevision } from "@/lib/secure-store";
import { subscribeOfflineWritesDelivered } from "@/lib/offline-queue";
import {
  addForegroundNotificationListener,
  addNotificationResponseListener,
  configureNotificationHandler,
  getChatMessageNotificationPayload,
  getLastNotificationResponseAsync,
  markNotificationAsReadFromPayload,
  resolveNotificationRoute,
  type Notification,
  type NotificationResponse,
  withNotificationSource
} from "@/services/notifications";
import { startGpsQueueSyncLoop } from "@/services/gpsTracking";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function SplashHider() {
  const { isHydrating } = useAuth();
  useEffect(() => {
    if (!isHydrating) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isHydrating]);
  return null;
}

function NotificationBridge() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;

    const refreshChatPayload = async (data: unknown) => {
      const chatPayload = getChatMessageNotificationPayload(data);
      if (!active || !chatPayload) return false;

      await queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      await queryClient.invalidateQueries({ queryKey: ["chat-messages", chatPayload.threadId] });
      return true;
    };

    const handleResponse = async (response: NotificationResponse) => {
      if (!active) return;
      const data = (response.notification.request.content.data ?? {}) as {
        actionUrl?: unknown;
        notificationId?: unknown;
        threadId?: unknown;
        tourId?: unknown;
        screen?: unknown;
        metadata?: unknown;
      };

      const chatPayload = getChatMessageNotificationPayload(data);
      const route = withNotificationSource(resolveNotificationRoute(data), chatPayload ? "chat-push" : "notifications");
      router.push(route as never);

      const handledChat = await refreshChatPayload(data);

      try {
        await markNotificationAsReadFromPayload(data);
      } catch {
        // Backend may not expose single update route in some environments.
      }

      if (!handledChat) {
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
        await queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
        await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
    };

    const handleForeground = (notification: Notification) => {
      if (!active) return;
      const data = notification.request.content.data ?? {};
      const title = notification.request.content.title ?? "Novo obaveštenje";
      const body = notification.request.content.body ?? "Imate novo obaveštenje.";
      Alert.alert(title, body);
      void refreshChatPayload(data).then((handledChat) => {
        if (handledChat) return;
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        void queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      });
    };

    const responseSub = addNotificationResponseListener(handleResponse);
    const foregroundSub = addForegroundNotificationListener(handleForeground);

    void getLastNotificationResponseAsync().then((last) => {
      if (active && last) {
        void handleResponse(last);
      }
    });

    return () => {
      active = false;
      responseSub?.remove();
      foregroundSub?.remove();
    };
  }, [queryClient, router, session?.user.id, session?.user.companyId, session?.user.driverId]);

  useEffect(() => {
    if (!session) return;

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    });

    return () => {
      appStateSub.remove();
    };
  }, [queryClient, session?.user.id, session?.user.companyId, session?.user.driverId]);

  useEffect(() => {
    if (!session) return;

    const runSync = async () => {
      try {
        await api.flushOfflineWrites();
      } catch {
        // Keep retrying on next interval.
      }
    };
    void runSync();
    const stopGpsSyncLoop = startGpsQueueSyncLoop();

    return () => {
      stopGpsSyncLoop();
    };
  }, [session?.user.id, session?.user.companyId, session?.user.driverId]);

  return null;
}

function OfflineDocumentDeliveryNotice() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!session?.user.id) return;
    let pending = false;
    const revision = getSessionRevision();
    const showIfActive = () => {
      if (getSessionRevision() !== revision) { pending = false; return; }
      if (!pending || AppState.currentState !== "active") return;
      pending = false;
      Alert.alert("Dokumenta", "Dokumenti koji su čekali slanje sada su sačuvani na serveru.");
    };
    const unsubscribe = subscribeOfflineWritesDelivered((paths) => {
      if (getSessionRevision() !== revision || !paths.includes("/api/documents")) return;
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tour-documents"] }),
        queryClient.invalidateQueries({ queryKey: ["documents"] }),
        queryClient.invalidateQueries({ queryKey: ["tour-details"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
      ]).catch(() => undefined);
      pending = true;
      showIfActive();
    });
    const stateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") showIfActive();
    });
    return () => {
      unsubscribe();
      stateSub.remove();
      pending = false;
    };
  }, [queryClient, session?.user.id, session?.user.companyId, session?.user.driverId]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <QueryProvider>
          <ThemeProvider>
            <SplashHider />
            <OfflineDocumentDeliveryNotice />
            <NotificationBridge />
            <Slot />
          </ThemeProvider>
        </QueryProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
