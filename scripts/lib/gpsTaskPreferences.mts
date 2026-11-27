import { repairSource } from './gpsNativeRepair.mts';

export const target = 'expo-task-manager/android/src/main/java/expo/modules/taskManager/TaskService.java';
// Retain the preferences handle, never an Activity/React context. Existing storage name
// and task contents stay unchanged. This does not alter headless/FGS scheduling.
export const edits = [
  ['  private WeakReference<Context> mContextRef;',
   '  private final SharedPreferences mTmsTaskPreferences; // tms.gps.preferences.v1\n  private WeakReference<Context> mContextRef;'],
  ['    mContextRef = new WeakReference<>(context);',
   `    Context tmsApplicationContext = context.getApplicationContext();
    Context tmsPreferencesContext = tmsApplicationContext != null ? tmsApplicationContext : context;
    mTmsTaskPreferences = tmsPreferencesContext.getSharedPreferences(SHARED_PREFERENCES_NAME, Context.MODE_PRIVATE);
    mContextRef = new WeakReference<>(context);`],
  [`  private SharedPreferences getSharedPreferences() {
    Context context = mContextRef.get();
    return context != null ? context.getSharedPreferences(SHARED_PREFERENCES_NAME, Context.MODE_PRIVATE) : null;
  }`,
   `  private SharedPreferences getSharedPreferences() {
    return mTmsTaskPreferences;
  }`]
];

export function taskPreferencesSource(source: string, remove = false): string {
  return repairSource(source, edits, remove);
}
