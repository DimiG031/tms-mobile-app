import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { GPS_TASK_NAME, sendGpsLog } from "@/services/gpsTracking";

TaskManager.defineTask(GPS_TASK_NAME, async ({ data, error }) => {
  if (error) {
    return;
  }

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  if (!locations.length) {
    return;
  }

  const latest = locations[locations.length - 1];
  await sendGpsLog(latest);
});
