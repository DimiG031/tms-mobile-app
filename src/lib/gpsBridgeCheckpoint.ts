import { requireOptionalNativeModule } from "expo-modules-core";

type Stage = "received" | "identity" | "submit" | "done" | "failed";
/** Optional development probe. Never await it or send identities/location payloads. */
export function gpsBridgeCheckpoint(stage: Stage): void {
  if (!__DEV__ || !["received", "identity", "submit", "done", "failed"].includes(stage)) return;
  try {
    const native = requireOptionalNativeModule<{ tmsGpsProbeAsync?: (stage: string) => Promise<void> }>("ExpoTaskManager");
    if (typeof native?.tmsGpsProbeAsync === "function") {
      void native.tmsGpsProbeAsync(stage).catch(() => undefined);
    }
  } catch { /* Diagnostics cannot change the GPS outcome, including with an older APK. */ }
}
