import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "@/lib/api";

let handlerConfigured = false;
let cachedPushToken: string | null = null;

type ExpoNotificationsModule = typeof import("expo-notifications");
type ListenerSubscription = { remove: () => void };

export type Notification = {
  request: {
    identifier?: string;
    content: {
      title?: string | null;
      body?: string | null;
      data?: Record<string, unknown>;
    };
  };
};

export type NotificationResponse = {
  notification: Notification;
};

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

function getNotificationsModule(): ExpoNotificationsModule | null {
  if (isExpoGo()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-notifications") as ExpoNotificationsModule;
  } catch {
    return null;
  }
}

function noopSubscription(): ListenerSubscription {
  return { remove: () => {} };
}

export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    handlerConfigured = true;
    return;
  }

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: true
      })
    });
  } catch {
    // No-op in environments without remote notifications support.
  }

  handlerConfigured = true;
}

export async function registerPushTokenForUser(userId: string): Promise<string | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;
  if (!Device.isDevice) {
    return null;
  }

  let finalStatus: string | undefined;
  try {
    const permissions = await Notifications.getPermissionsAsync();
    finalStatus = permissions.status;
  } catch {
    return null;
  }

  if (finalStatus !== "granted") {
    try {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    } catch {
      return null;
    }
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined;

  let tokenResult: { data: string };
  try {
    tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  } catch {
    return null;
  }
  const expoPushToken = tokenResult.data;
  cachedPushToken = expoPushToken;

  await api.post(`/api/users/${userId}/push-token`, {
    expoPushToken,
    platform: Platform.OS === "ios" ? "ios" : "android"
  });

  return expoPushToken;
}

export async function syncPushTokenForUser(userId: string, token: string): Promise<void> {
  cachedPushToken = token;
  await api.post(`/api/users/${userId}/push-token`, {
    expoPushToken: token,
    platform: Platform.OS === "ios" ? "ios" : "android"
  });
}

export async function unregisterPushTokenForUser(userId: string): Promise<void> {
  await api.delete(`/api/users/${userId}/push-token`);
  cachedPushToken = null;
}

export function addPushTokenListener(
  callback: (token: string) => void
): ListenerSubscription {
  const Notifications = getNotificationsModule();
  if (!Notifications) return noopSubscription();

  try {
    return Notifications.addPushTokenListener((value) => {
      const nextToken = value?.data;
      if (!nextToken) return;
      cachedPushToken = nextToken;
      callback(nextToken);
    });
  } catch {
    return noopSubscription();
  }
}

export function addForegroundNotificationListener(
  callback: (notification: Notification) => void
): ListenerSubscription {
  const Notifications = getNotificationsModule();
  if (!Notifications) return noopSubscription();

  try {
    return Notifications.addNotificationReceivedListener((notification) => {
      callback(notification as unknown as Notification);
    });
  } catch {
    return noopSubscription();
  }
}

export function addNotificationResponseListener(
  callback: (response: NotificationResponse) => void
): ListenerSubscription {
  const Notifications = getNotificationsModule();
  if (!Notifications) return noopSubscription();

  try {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      callback(response as unknown as NotificationResponse);
    });
  } catch {
    return noopSubscription();
  }
}

export async function getLastNotificationResponseAsync(): Promise<NotificationResponse | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return (response as unknown as NotificationResponse) ?? null;
  } catch {
    return null;
  }
}

export async function markNotificationAsReadFromPayload(data: unknown): Promise<void> {
  if (!data || typeof data !== "object") return;
  const payload = data as {
    notificationId?: unknown;
    metadata?: unknown;
  };

  const fromRoot = typeof payload.notificationId === "string" ? payload.notificationId : null;
  const metadata =
    payload.metadata && typeof payload.metadata === "object"
      ? (payload.metadata as { notificationId?: unknown })
      : null;
  const fromMetadata = metadata && typeof metadata.notificationId === "string" ? metadata.notificationId : null;
  const notificationId = fromRoot ?? fromMetadata;

  if (!notificationId) return;
  await api.patch(`/api/notifications/${notificationId}`, { isRead: true });
}

type ResolveNotificationRouteParams = {
  actionUrl?: unknown;
  notificationId?: unknown;
  tourId?: unknown;
};

export function resolveNotificationRoute(params: ResolveNotificationRouteParams): string {
  const actionUrl = typeof params.actionUrl === "string" ? params.actionUrl : "";
  const tourIdFromAction = actionUrl.match(/\/tours\/([^/?#]+)/)?.[1];
  const explicitTourId = typeof params.tourId === "string" ? params.tourId : null;
  const tourId = explicitTourId ?? tourIdFromAction;
  if (tourId) {
    return `/(driver)/tours/${tourId}`;
  }
  return "/(driver)/notifications";
}
