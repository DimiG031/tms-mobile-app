// Explicit development-only workaround for expo-task-manager 14.0.9.
// No automatic install hook: a target Android acceptance is required.
const root = 'expo-task-manager/android/src/main/java/expo/modules/taskManager/';
export const repairs = [
  { path: root + 'TaskService.java', edits: [
    [`    } else {
      appEvents = new ArrayList<>();
      appEvents.add(eventId);
    }

    if (taskManager != null)`, `    } else {
      appEvents = sEvents.get(appScopeKey); // tms.gps.repair.pending
      appEvents.add(eventId);
    }

    if (taskManager != null)`],
    [`  private void invalidateAppRecord(String appScopeKey) {`, `  private void invalidateAppRecord(String appScopeKey) {
    // A headless-loaded React host can subsequently acquire an Activity.
    TaskManagerInterface activeManager = getTaskManager(appScopeKey);
    if (activeManager instanceof TaskManagerInternalModule &&
        ((TaskManagerInternalModule) activeManager).tmsHasHostActivity()) {
      Log.i("TmsGpsBridge", "repair.v1 retained_host_manager");
      return;
    } // tms.gps.repair.host`]
  ] },
  { path: root + 'TaskManagerInternalModule.java', edits: [
    ['  private WeakReference<Context> mContextRef;', '  private volatile boolean mTmsHasHostActivity = false; // tms.gps.repair.activity\n  private WeakReference<Context> mContextRef;'],
    ['  public void onHostResume() {', '  public void onHostResume() {\n    mTmsHasHostActivity = true; // tms.gps.repair.resume'],
    ['  public void onHostDestroy() {', '  public void onHostDestroy() {\n    mTmsHasHostActivity = false; // tms.gps.repair.host_destroy'],
    ['  public void onDestroy() {', '  public void onDestroy() {\n    mTmsHasHostActivity = false; // tms.gps.repair.module_destroy'],
    ['  private boolean isRunningInHeadlessMode() {', '  public boolean tmsHasHostActivity() { return mTmsHasHostActivity; } // tms.gps.repair.get_host\n\n  private boolean isRunningInHeadlessMode() {']
  ] }
];

export function repairSource(source: string, edits: string[][], remove = false): string {
  for (const [before, after] of edits) {
    const patched = source.split(after).length - 1;
    if (patched > 1) throw new Error('Duplicate native repair; refusing to patch');
    if (patched === 1) {
      // Strip the known replacement before validating the remaining original anchor.
      const restored = source.replace(after, before);
      if (restored.split(before).length !== 2) throw new Error('Native repair source drift');
      if (remove) source = restored;
    } else {
      if (source.split(before).length !== 2) throw new Error('Native repair source drift');
      if (!remove) source = source.replace(before, after);
    }
  }
  return source;
}
