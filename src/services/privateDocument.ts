import { config } from "@/lib/config";
import { readSession, getSessionRevision, assertSessionRevision } from "@/lib/secure-store";
import { newTraceId, TRACE_HEADER } from "@/lib/diagnostics";

/** Only the authenticated local-byte endpoint receives a bearer; never a signed/external URL. */
export async function openPrivateDocument(reference: string, revision = getSessionRevision()): Promise<void> {
  assertSessionRevision(revision);
  const base = new URL(config.apiUrl);
  const url = new URL(reference, base.origin);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.origin !== base.origin || !url.pathname.startsWith("/api/files/documents/") || url.searchParams.get("local") !== "1") {
    throw new Error("Neispravna adresa privatnog dokumenta.");
  }
  url.search = "?local=1"; url.hash = "";
  const session = await readSession();
  assertSessionRevision(revision);
  if (!session?.token) throw new Error("Prijavite se ponovo da otvorite dokument.");
  let fs: typeof import("expo-file-system/legacy");
  let sharing: typeof import("expo-sharing");
  try {
    fs = require("expo-file-system/legacy");
    sharing = require("expo-sharing");
    if (!fs.cacheDirectory || typeof fs.downloadAsync !== "function" || typeof sharing.shareAsync !== "function") throw new Error("Native module unavailable");
  } catch {
    throw new Error("Privatno preuzimanje nije dostupno u ovom buildu. Ažurirajte development build aplikacije.");
  }
  const ext = url.pathname.match(/\.(pdf|jpe?g|png|webp|gif|txt)$/i)?.[1].toLowerCase() ?? "bin";
  const types: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", txt: "text/plain" };
  const destination = fs.cacheDirectory + "tms-document-" + newTraceId() + "." + ext;
  let shared = false;
  try {
    let result: Awaited<ReturnType<typeof fs.downloadAsync>>;
    try { result = await fs.downloadAsync(url.toString(), destination, { headers: { Authorization: `Bearer ${session.token}`, [TRACE_HEADER]: newTraceId() } }); }
    catch { assertSessionRevision(revision); throw new Error("Nema veze sa serverom. Preuzimanje dokumenta nije potvrđeno. Pokušajte ponovo."); }
    assertSessionRevision(revision);
    if (result.status !== 200) {
      if (result.status === 401) throw new Error("Sesija je istekla. Prijavite se ponovo.");
      if (result.status === 403 || result.status === 404) throw new Error("Dokument nije dostupan ili nemate dozvolu za pregled.");
      throw new Error("Preuzimanje dokumenta nije potvrđeno. Pokušajte ponovo.");
    }
    if (!(await sharing.isAvailableAsync())) throw new Error("Na uređaju nije dostupno otvaranje/deljenje dokumenta.");
    assertSessionRevision(revision);
    await sharing.shareAsync(destination, { mimeType: types[ext] ?? "application/octet-stream", dialogTitle: "Dokument" });
    shared = true;
    assertSessionRevision(revision);
  } finally {
    // Keep an explicitly shared file available to its viewer; failed/stale downloads are removed.
    if (!shared) await fs.deleteAsync(destination, { idempotent: true }).catch(() => undefined);
  }
}
