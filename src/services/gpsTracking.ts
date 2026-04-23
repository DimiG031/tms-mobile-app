import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { type NetInfoSubscription } from "@react-native-community/netinfo";
import * as Location from "expo-location";
import { api } from "@/lib/api";
import { readSession } from "@/lib/secure-store";

export const GPS_TASK_NAME = "tms-background-gps-task";
const TRACKING_STATE_KEY = "gps_tracking_state_v1";

type GpsTrackingState = {
  tourId: string;
  vehicleId: string;
};

type GpsLogPayload = {
  vehicleId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speedKmH: number | null;
};

let gpsQueueSyncInterval: ReturnType<typeof setInterval> | null = null;
let gpsQueueNetInfoUnsubscribe: NetInfoSubscription | null = null;

export async function startGpsTracking(params: { tourId: string; vehicleId: string }): Promise<void> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") {
    throw new Error("Location permission is required.");
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") {
    throw new Error("Background location permission is required.");
  }

  await AsyncStorage.setItem(TRACKING_STATE_KEY, JSON.stringify(params));

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(GPS_TASK_NAME);
  if (alreadyStarted) {
    return;
  }

  await Location.startLocationUpdatesAsync(GPS_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30_000,
    distanceInterval: 0,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "TMS GPS tracking active",
      notificationBody: "Sending vehicle position while tour is in transit."
    }
  });
}

export async function stopGpsTracking(): Promise<void> {
  await AsyncStorage.removeItem(TRACKING_STATE_KEY);
  const started = await Location.hasStartedLocationUpdatesAsync(GPS_TASK_NAME);
  if (started) {
    await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
  }
}

export async function getGpsTrackingState(): Promise<GpsTrackingState | null> {
  const raw = await AsyncStorage.getItem(TRACKING_STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GpsTrackingState;
  } catch {
    return null;
  }
}

export async function sendGpsLog(location: Location.LocationObject): Promise<void> {
  const state = await getGpsTrackingState();
  const session = await readSession();
  if (!state?.vehicleId || !session?.token) {
    return;
  }

  const payload: GpsLogPayload = {
    vehicleId: state.vehicleId,
    timestamp: new Date().toISOString(),
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    speedKmH: typeof location.coords.speed === "number" ? location.coords.speed * 3.6 : null
  };

  await api.postQueued("/api/gps-logs", payload);
}

export async function flushGpsQueue(): Promise<void> {
  await api.flushOfflineWrites();
}

export function startGpsQueueSyncLoop(): () => void {
  if (!gpsQueueSyncInterval) {
    gpsQueueSyncInterval = setInterval(() => {
      void flushGpsQueue();
    }, 20_000);
  }

  if (!gpsQueueNetInfoUnsubscribe) {
    gpsQueueNetInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        void flushGpsQueue();
      }
    });
  }

  return () => {
    if (gpsQueueSyncInterval) {
      clearInterval(gpsQueueSyncInterval);
      gpsQueueSyncInterval = null;
    }
    if (gpsQueueNetInfoUnsubscribe) {
      gpsQueueNetInfoUnsubscribe();
      gpsQueueNetInfoUnsubscribe = null;
    }
  };
}
