export type TourStatusOutcome = { statusSaved: true; gps: "started" | "stopped" | "unchanged" | "failed"; warning?: string };
export async function changeTourStatus(params: { tourId: string; status: string; vehicleId?: string | null }, deps: {
  assertCurrent: () => void; patch: () => Promise<unknown>; start: () => Promise<void>; stop: () => Promise<void>;
}): Promise<TourStatusOutcome> {
  deps.assertCurrent();
  if (!params.tourId) throw new Error("Nedostaje tura.");
  if (params.status === "IN_TRANSIT" && !params.vehicleId) throw new Error("Turi nije dodeljeno vozilo. Status nije promenjen.");
  await deps.patch();
  deps.assertCurrent();
  try {
    if (params.status === "IN_TRANSIT") { await deps.start(); deps.assertCurrent(); return { statusSaved: true, gps: "started" }; }
    if (params.status === "COMPLETED") { await deps.stop(); deps.assertCurrent(); return { statusSaved: true, gps: "stopped" }; }
    return { statusSaved: true, gps: "unchanged" };
  } catch {
    deps.assertCurrent();
    return { statusSaved: true, gps: "failed", warning: params.status === "IN_TRANSIT"
      ? "Status ture je sačuvan na serveru, ali GPS praćenje nije pokrenuto. Proverite dozvole za lokaciju."
      : "Status ture je sačuvan na serveru, ali zaustavljanje GPS praćenja nije potvrđeno. Proverite GPS praćenje." };
  }
}
export function stopActionNotice(queued: boolean, action: string): string {
  if (queued) return "Zahtev je sačuvan na uređaju i čeka slanje. Dolazak/odlazak još nije potvrđen na serveru. Kada se veza vrati, proverite stanicu nakon osvežavanja.";
  return action === "ARRIVED" ? "Dolazak je potvrđen na serveru." : "Odlazak je potvrđen na serveru.";
}
