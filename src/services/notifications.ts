import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "@/lib/api";

type ExpoNotificationsModule = typeof import("expo-notifications");
export type NotificationResponse = import("expo-notifications").NotificationResponse;
export type Notification = import("expo-notifications").Notification;

let handlerConfigured = false;

export function isExpoGoRuntime(): boolean {
  const appOwnership = (Constants as { appOwnership?: string | null }).appOwnership;
  const executionEnvironment = (Constants as { executionEnvironment?: string | null }).executionEnvironment;
  return appOwnership === "expo" || executionEnvironment === "storeClient";
}

function getNotificationsModule(): ExpoNotificationsModule | null {
  if (isExpoGoRuntime()) return null;
  return require("expo-notifications") as ExpoNotificationsModule;
}

export function configureNotificationHandler(): void {
  if (handlerConfigured) return;

  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true
    })
  });

  handlerConfigured = true;
}

export function addNotificationResponseListener(
  handler: (response: NotificationResponse) => void
): { remove: () => void } | null {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export function addForegroundNotificationListener(
  handler: (notification: Notification) => void
): { remove: () => void } | null {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;
  return Notifications.addNotificationReceivedListener(handler);
}

export function addPushTokenListener(
  handler: (token: string) => void
): { remove: () => void } | null {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;
  return Notifications.addPushTokenListener((event) => {
    handler(event.data);
  });
}

export async function getLastNotificationResponseAsync(): Promise<NotificationResponse | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;
  return Notifications.getLastNotificationResponseAsync();
}

export async function registerPushTokenForUser(userId: string): Promise<string | null> {
  if (!Device.isDevice || isExpoGoRuntime()) return null;

  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;

  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
  const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const expoPushToken = tokenResult.data;

  await api.post(`/api/users/${userId}/push-token`, {
    expoPushToken,
    platform: Platform.OS === "ios" ? "ios" : "android"
  });

  return expoPushToken;
}

export async function syncPushTokenForUser(userId: string, expoPushToken: string): Promise<void> {
  await api.post(`/api/users/${userId}/push-token`, {
    expoPushToken,
    platform: Platform.OS === "ios" ? "ios" : "android"
  });
}

export async function unregisterPushTokenForUser(userId: string): Promise<void> {
  await api.delete(`/api/users/${userId}/push-token`);
}

type NotificationPayload = {
  type?: unknown;
  actionUrl?: unknown;
  notificationId?: unknown;
  tourId?: unknown;
  threadId?: unknown;
  screen?: unknown;
  metadata?: unknown;
};

function mapPathToAppRoute(path: string): string {
  if (path === "/" || path === "/home" || path === "/dashboard") return "/";
  if (path === "/notifications") return "/notifications";
  if (path === "/chat") return "/chat";
  if (path.startsWith("/chat/")) return path;
  if (path === "/profile") return "/profile";
  if (path.startsWith("/tours/")) return path;
  if (path === "/tours") return "/tours";
  if (path === "/login") return "/login";
  if (path === "/forgot-password") return "/forgot-password";
  return "/notifications";
}

export function resolveNotificationRoute(payload: NotificationPayload): string {
  const actionUrl = typeof payload.actionUrl === "string" ? payload.actionUrl : null;

  if (actionUrl) {
    if (actionUrl.startsWith("http://") || actionUrl.startsWith("https://")) {
      try {
        const parsed = new URL(actionUrl);
        return mapPathToAppRoute(parsed.pathname || "/notifications");
      } catch {
        return "/notifications";
      }
    }

    if (actionUrl.startsWith("/")) {
      return mapPathToAppRoute(actionUrl);
    }
  }

  const metadata =
    payload.metadata && typeof payload.metadata === "object"
      ? (payload.metadata as { tourId?: unknown; threadId?: unknown })
      : null;
  const tourId =
    (typeof payload.tourId === "string" ? payload.tourId : null) ??
    (metadata && typeof metadata.tourId === "string" ? metadata.tourId : null);
  if (tourId) return `/tours/${tourId}`;

  const threadId =
    (typeof payload.threadId === "string" ? payload.threadId : null) ??
    (metadata && typeof metadata.threadId === "string" ? metadata.threadId : null);
  if (threadId) return `/chat/${threadId}`;

  const type = typeof payload.type === "string" ? payload.type.toLowerCase() : null;
  if (type === "chat") return "/chat";

  const screen = typeof payload.screen === "string" ? payload.screen.toLowerCase() : null;
  if (screen === "profile") return "/profile";
  if (screen === "tours") return "/tours";
  if (screen === "chat") return "/chat";

  return "/notifications";
}

export async function markNotificationAsReadFromPayload(payload: NotificationPayload): Promise<void> {
  const metadata = payload.metadata && typeof payload.metadata === "object" ? (payload.metadata as { notificationId?: unknown }) : null;
  const id =
    (typeof payload.notificationId === "string" ? payload.notificationId : null) ??
    (metadata && typeof metadata.notificationId === "string" ? metadata.notificationId : null);
  if (!id) return;
  await api.patch(`/api/notifications/${id}`, { isRead: true });
}
