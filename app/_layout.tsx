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

    const refreshChatPayload = async (data: unknown) => {
      const chatPayload = getChatMessageNotificationPayload(data);
      if (!chatPayload) return false;

      await queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      await queryClient.invalidateQueries({ queryKey: ["chat-messages", chatPayload.threadId] });
      return true;
    };

    const handleResponse = async (response: NotificationResponse) => {
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
      if (last) {
        void handleResponse(last);
      }
    });

    return () => {
      responseSub?.remove();
      foregroundSub?.remove();
    };
  }, [queryClient, router, session]);

  useEffect(() => {
    if (!session) return;

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    });

    return () => {
      appStateSub.remove();
    };
  }, [queryClient, session]);

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
  }, [session]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <ThemeProvider>
            <SplashHider />
            <NotificationBridge />
            <Slot />
          </ThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
