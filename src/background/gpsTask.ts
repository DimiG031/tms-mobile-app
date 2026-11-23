import { gpsBridgeCheckpoint } from "@/lib/gpsBridgeCheckpoint";
import { mobileDiagnostic } from "@/lib/diagnostics";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { GPS_TASK_NAME, sendGpsLog } from "@/services/gpsTracking";

TaskManager.defineTask(GPS_TASK_NAME, async ({ data, error }) => {
  gpsBridgeCheckpoint("received");
  mobileDiagnostic("info", "operation.started", { operation: "gps.task" });
  if (error) {
    mobileDiagnostic("warn", "operation.failed", { operation: "gps.task.native", errorKind: "unexpected" });
    return;
  }

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  if (!locations.length) {
    mobileDiagnostic("info", "operation.completed", { operation: "gps.task.empty" });
    return;
  }

  const latest = locations[locations.length - 1];
  try {
    await sendGpsLog(latest);
    gpsBridgeCheckpoint("done");
    mobileDiagnostic("info", "operation.completed", { operation: "gps.task" });
  } catch (error) {
    gpsBridgeCheckpoint("failed");
    mobileDiagnostic("warn", "operation.failed", { operation: "gps.task.send", errorKind: "unexpected" });
    throw error;
  }
});
