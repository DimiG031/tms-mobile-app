import { useState } from "react";
import { Alert } from "react-native";
import { Pressable, Text, View } from "@/components/ui";
import { useTheme } from "@/providers/ThemeProvider";
import { useRouteStopAction } from "@/queries/useTourStops";
import { useStopActionSnapshot } from "@/queries/useStopActionState";
import { stopActionState, stopIdFromPath, type StopMovement } from "@/lib/stopActionState";
import { stopActionNotice } from "@/lib/tourStatusChange";
import { api } from "@/lib/api";
import { SessionChangedError, getSessionRevision } from "@/lib/secure-store";
import type { TourStop } from "@/lib/types";
export function StopActionControls({ stop, tourId }: { stop: TourStop; tourId?: string }) {
  const theme = useTheme(); const action = useRouteStopAction(tourId); const snapshot = useStopActionSnapshot();
  const [busy, setBusy] = useState(false);
  const pending = snapshot.data?.queue.find(item => stopIdFromPath(item.path) === stop.id);
  const receipt = snapshot.data?.receipts.find(item => stopIdFromPath(item.path) === stop.id);
  const unavailable = snapshot.isPending || snapshot.isFetching || snapshot.isError || action.isPending || busy;
  const state = stopActionState(stop.status, receipt?.status, Boolean(pending) || unavailable);
  const showError = (error: unknown) => { if (!(error instanceof SessionChangedError)) Alert.alert("Stanica", error instanceof Error ? error.message : "Promena nije potvrđena."); };
  const send = (movement: StopMovement) => {
    if (!stop.id || (movement === "ARRIVED" ? !state.canArrive : !state.canDepart)) return;
    const revision = getSessionRevision();
    action.mutate({ stopId: stop.id, action: movement, timestamp: new Date().toISOString() }, {
      onSuccess: result => { if (getSessionRevision() === revision) Alert.alert("Stanica", result.queued && result.delivery === "blocked" ? result.message ?? "Server je odbio zahtev. Proverite stanje stanice." : stopActionNotice(result.queued, movement)); },
      onError: error => { if (getSessionRevision() === revision) showError(error); },
    });
  };
  const refresh = async () => { await snapshot.refetch(); };
  const retry = async () => {
    if (!pending || busy) return; const revision = getSessionRevision(); setBusy(true);
    try { const result = await api.retryStation(pending.id); if (getSessionRevision() !== revision) return; Alert.alert("Stanica", result.queued ? result.message ?? "Zahtev i dalje čeka potvrdu servera." : "Akcija stanice je potvrđena na serveru."); }
    catch (error) { if (getSessionRevision() === revision) showError(error); }
    finally { setBusy(false); await refresh(); }
  };
  const discard = () => {
    if (!pending?.blocked || busy) return;
    const revision = getSessionRevision();
    Alert.alert("Odbijeni zahtev", "Odbaciti zahtev koji je server odbio? Nepotvrđeni zahtev bez odbijanja ostaje sačuvan.", [
      { text: "Nazad", style: "cancel" },
      { text: "Odbaci odbijeni zahtev", style: "destructive", onPress: () => { if (getSessionRevision() !== revision) return; setBusy(true); void api.dismissStation(pending.id).catch(error => { if (getSessionRevision() === revision) showError(error); }).finally(() => { setBusy(false); void refresh(); }); } },
    ]);
  };
  return <View className="mt-3">
    <View className="flex-row gap-2">
      <Pressable disabled={!stop.id || !state.canArrive} onPress={() => send("ARRIVED")} className="flex-1 rounded-xl px-3 py-2 disabled:opacity-40" style={{ backgroundColor: theme.accent.primarySoft }}>
        <Text className="text-center text-sm font-semibold" style={{ color: theme.accent.primaryDark }}>{action.isPending && action.variables?.action === "ARRIVED" ? "Slanje..." : "Stigao"}</Text>
      </Pressable>
      <Pressable disabled={!stop.id || !state.canDepart} onPress={() => send("DEPARTED")} className="flex-1 rounded-xl px-3 py-2 disabled:opacity-40" style={{ backgroundColor: theme.accent.primary }}>
        <Text className="text-center text-sm font-semibold text-white">{action.isPending && action.variables?.action === "DEPARTED" ? "Slanje..." : "Krenuo"}</Text>
      </Pressable>
    </View>
    {pending ? <View className="mt-2 rounded-lg border p-2" style={{ borderColor: theme.surface.border }}>
      <Text className="text-xs" style={{ color: theme.text.secondary }}>{pending.blocked ? pending.failureMessage ?? "Server je odbio zahtev." : "Čeka se potvrda servera. Akcije ove stanice su zaključane."}</Text>
      <Pressable disabled={busy || action.isPending} onPress={() => void retry()} className="mt-2 disabled:opacity-40"><Text className="text-xs font-semibold" style={{ color: theme.accent.primary }}>{busy ? "Provera..." : "Pokušaj slanje ponovo"}</Text></Pressable>
      {pending.blocked ? <Pressable disabled={busy} onPress={discard} className="mt-2"><Text className="text-xs" style={{ color: theme.text.secondary }}>Odbaci odbijeni zahtev</Text></Pressable> : null}
    </View> : state.finished ? <Text className="mt-2 text-xs" style={{ color: theme.text.muted }}>{state.status === "CANCELED" || state.status === "CANCELLED" ? "Stanica je otkazana." : "Odlazak je potvrđen. Stanica je završena."}</Text>
      : <Text className="mt-2 text-xs" style={{ color: theme.text.muted }}>{state.status === "ARRIVED" ? "Dolazak je potvrđen. Sledeća akcija: Krenuo." : "Prvo potvrdite dolazak na stanicu."}</Text>}
    {snapshot.isError ? <Pressable onPress={() => void refresh()} className="mt-2"><Text className="text-xs" style={{ color: theme.text.secondary }}>Lokalno stanje nije učitano. Pokušaj ponovo.</Text></Pressable> : null}
  </View>;
}
