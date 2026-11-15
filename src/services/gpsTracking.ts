import { gpsMeasurement } from "@/lib/gpsMeasurement";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { type NetInfoSubscription } from "@react-native-community/netinfo";
import * as Location from "expo-location";
import { api } from "@/lib/api";
import { config } from "@/lib/config";
import { offlineOwner } from "@/lib/offline-owner";
import { readSession, getSessionRevision, assertSessionRevision } from "@/lib/secure-store";

export const GPS_TASK_NAME = "tms-background-gps-task";
const TRACKING_STATE_KEY = "gps_tracking_state_v1";

type GpsTrackingState = {
  owner?: string;
  tourId: string;
  vehicleId: string;
};


let gpsQueueSyncInterval: ReturnType<typeof setInterval> | null = null;
let gpsQueueNetInfoUnsubscribe: NetInfoSubscription | null = null;

let trackingTail: Promise<unknown> = Promise.resolve();
function trackingLock<T>(work: () => Promise<T>): Promise<T> {
  const result = trackingTail.then(work);
  trackingTail = result.catch(() => undefined);
  return result;
}
export async function startGpsTracking(params: { tourId: string; vehicleId: string }, expectedRevision = getSessionRevision()): Promise<void> {
  const revision = expectedRevision;
  const owner = offlineOwner(await readSession(), config.apiUrl);
  assertSessionRevision(revision);
  if (!owner) throw new Error("Za GPS praćenje potrebna je prijava.");
  const fg = await Location.requestForegroundPermissionsAsync();
  assertSessionRevision(revision);
  if (fg.status !== "granted") {
    throw new Error("Za GPS je potrebna dozvola za lokaciju.");
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  assertSessionRevision(revision);
  if (bg.status !== "granted") {
    throw new Error("Za GPS je potrebna dozvola za lokaciju u pozadini.");
  }

  await trackingLock(async () => {
    assertSessionRevision(revision);

    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(GPS_TASK_NAME);
    assertSessionRevision(revision);
    if (alreadyStarted) {
      await AsyncStorage.setItem(TRACKING_STATE_KEY, JSON.stringify({ ...params, owner }));
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
    assertSessionRevision(revision);
    await AsyncStorage.setItem(TRACKING_STATE_KEY, JSON.stringify({ ...params, owner }));
  });
}

export async function stopGpsTracking(expectedOwner?: string): Promise<void> {
  const owner = expectedOwner ?? offlineOwner(await readSession(), config.apiUrl);
  await trackingLock(async () => {
    const state = await getGpsTrackingState();
    if (state?.owner && state.owner !== owner) return;
    await AsyncStorage.removeItem(TRACKING_STATE_KEY);
    const started = await Location.hasStartedLocationUpdatesAsync(GPS_TASK_NAME);
    if (started) {
      await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
    }
  });
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
  const owner = offlineOwner(session, config.apiUrl);
  if (!state?.vehicleId || !session?.token || !owner || state.owner !== owner) {
    return;
  }

  const payload = gpsMeasurement(location, state.vehicleId, state.tourId);
  if (!payload) return;

  await api.postQueuedForOwner("/api/gps-logs", payload, owner);
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

