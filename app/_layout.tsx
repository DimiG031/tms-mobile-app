import "../global.css";
import "@/background/gpsTask";

import { useEffect } from "react";
import { Alert } from "react-native";
import { Slot, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import {
  addForegroundNotificationListener,
  addNotificationResponseListener,
  configureNotificationHandler,
  getLastNotificationResponseAsync,
  markNotificationAsReadFromPayload,
  type Notification,
  type NotificationResponse,
  resolveNotificationRoute
} from "@/services/notifications";
import { startGpsQueueSyncLoop } from "@/services/gpsTracking";

function NotificationBridge() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  useEffect(() => {
    if (!session) return;

    const handleResponse = async (response: NotificationResponse) => {
      const data = (response.notification.request.content.data ?? {}) as {
        actionUrl?: unknown;
        notificationId?: unknown;
        tourId?: unknown;
        screen?: unknown;
        metadata?: unknown;
      };

      const route = resolveNotificationRoute(data);
      router.push(route as never);

      try {
        await markNotificationAsReadFromPayload(data);
      } catch {
        // Backend may not expose single update route in some environments.
      }

      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    };

    const handleForeground = (notification: Notification) => {
      const title = notification.request.content.title ?? "Novo obavestenje";
      const body = notification.request.content.body ?? "Imate novo obavestenje.";
      Alert.alert(title, body);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
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
          <NotificationBridge />
          <Slot />
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
