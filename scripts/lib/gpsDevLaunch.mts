import { repairSource } from './gpsNativeRepair.mts';
export const target = 'expo-task-manager/android/src/main/java/expo/modules/taskManager/TaskService.java';
export const anchor = '    mTasksAndEventsRepository.putEventForAppScopeKey(appScopeKey, body);';
export const guard = `    Context tmsLaunchContext = mContextRef.get();
    if (tmsLaunchContext != null &&
        (tmsLaunchContext.getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0 &&
        "tms-background-gps-task".equals(task.getName())) {
      Log.i("TmsGpsBridge", "devlaunch.v1 waiting_for_ui");
      return;
    }`;
// Explicit opt-in development workaround: retain the event before deferring headless startup.
export function devLaunchSource(source: string, remove = false): string {
  if (source.split(guard).length > 2) throw Error('Duplicate development launch gate.');
  return repairSource(source, [[anchor, anchor + '\n\n' + guard]], remove);
}
