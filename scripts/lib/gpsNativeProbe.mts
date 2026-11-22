export const versions = { 'expo-task-manager': '14.0.9', 'expo-location': '19.0.8' };
const manager = 'expo-task-manager/android/src/main/java/expo/modules/taskManager/';
export const patches = [
  { path: 'expo-location/android/src/main/java/expo/modules/location/taskConsumers/LocationTaskConsumer.kt', edits: [
    ['val result = LocationResult.extractResult(intent)', 'Log.i("TmsGpsBridge", "probe.v1 location.broadcast")'],
    ['executeTaskWithLocationBundles(locationBundles) { jobService.jobFinished(params, false) }', 'Log.i("TmsGpsBridge", "probe.v1 location.job")'],
    ['mTask?.execute(data, null, callback)', 'Log.i("TmsGpsBridge", "probe.v1 location.execute")']
  ] },
  { path: manager + 'TaskService.java', edits: [
    ['Bundle body = createExecutionEventBody(task, data, error);', 'Log.i("TmsGpsBridge", "probe.v1 service.execute");'],
    ['// The app is not fully loaded as its task manager is not there yet.', 'Log.i("TmsGpsBridge", "probe.v1 service.waiting_for_manager");']
  ] },
  { path: manager + 'TaskManagerInternalModule.java', edits: [
    ['mEventsQueue.add(body);', 'Log.i("TmsGpsBridge", "probe.v1 manager.queued");'],
    ['// Execute any events that came before this call.', 'Log.i("TmsGpsBridge", "probe.v1 manager.flush");'],
    ['mEmitEventWrapper.emit(TaskManagerInterface.EVENT_NAME, body);', 'Log.i("TmsGpsBridge", "probe.v1 manager.emit");']
  ] }
];

// Pure transform; reject upstream drift before writing any file. Static markers only.
export function probeSource(source: string, edits: string[][], remove = false): string {
  for (const [anchor, marker] of edits) {
    if (source.split(anchor).length !== 2) throw new Error('Native probe anchor changed; refusing to patch');
    const insertion = marker + '\n';
    const occurrences = source.split(marker).length - 1;
    if (occurrences > 1) throw new Error('Duplicate native probe marker');
    if (remove) {
      if (occurrences) source = source.replace(insertion, '');
    } else if (!occurrences) {
      source = source.replace(anchor, insertion + anchor);
    }
  }
  return source;
}
