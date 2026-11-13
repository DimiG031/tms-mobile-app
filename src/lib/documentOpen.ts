/** Pure document-opening flow: credentials stay inside the injected API client. */
export type DocumentOpenDependencies = {
 apiUrl: string;
 get: (path: string) => Promise<unknown>;
 openUrl: (url: string) => Promise<unknown>;
 shareHtml: (html: string, title: string) => Promise<unknown>;
};
function httpUrl(value: string, base?: string): URL {
 const url = base ? new URL(value, base) : new URL(value);
 if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Adresa dokumenta nije podržana.");
 return url;
}
function record(value: unknown): Record<string, unknown> {
 if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Server nije vratio ispravan dokument.");
 return value as Record<string, unknown>;
}
function payload(value: unknown): Record<string, unknown> {
 const result = record(value);
 if (result.ok === false) throw new Error("Dokument nije dostupan.");
 return record(result.data ?? result);
}
function escapeHtml(value: unknown): string {
 return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
}
export function cmrPreviewHtml(data: Record<string, unknown>): string {
 const party = (key: string) => {
  const value = data[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const item = value as Record<string, unknown>;
  return [item.name, item.address, item.city, item.country].filter(Boolean).join(", ");
 };
 const rows: [string, unknown][] = [
  ["CMR broj", data.cmrNumber], ["Broj naloga", data.orderNumber],
  ["Pošiljalac", party("shipper")], ["Primalac", party("consignee")], ["Prevoznik", party("carrier")],
  ["Mesto utovara", data.loadingAddress], ["Datum utovara", data.loadingDate],
  ["Mesto istovara", data.unloadingAddress], ["Datum istovara", data.unloadingDate],
  ["Napomena utovara", data.loadingNotes], ["Napomena istovara", data.unloadingNotes], ["Napomene", data.notes],
 ];
 return `<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:24px;color:#142235}h1{font-size:22px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd4df;padding:10px;text-align:left;white-space:pre-wrap}th{width:30%;background:#f1f5f9}</style></head><body><h1>CMR — pregled podataka naloga</h1><table>${rows.map(([label,value])=>`<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</table></body></html>`;
}
export async function openDocumentReference(reference: string, deps: DocumentOpenDependencies): Promise<void> {
 const input = reference.trim();
 if (!input) throw new Error("Dokument nema adresu za otvaranje.");
 const base = httpUrl(deps.apiUrl);
 const url = httpUrl(input, base.origin);
 if (url.origin !== base.origin) { await deps.openUrl(url.toString()); return; }
 const cmr = url.pathname.match(/^\/(?:dashboard\/transport\/freight-orders|api\/freight-orders)\/([^/]+)\/cmr\/?$/);
 if (cmr) {
  const id = decodeURIComponent(cmr[1]);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Neispravna oznaka CMR naloga.");
  const data = payload(await deps.get(`/api/freight-orders/${encodeURIComponent(id)}/cmr`));
  await deps.shareHtml(cmrPreviewHtml(data), "CMR — pregled");
  return;
 }
 const privatePath = url.pathname.startsWith("/api/files/") ? url.pathname
  : url.pathname.startsWith("/uploads/") ? url.pathname.replace(/^\/uploads\//, "/api/files/") : null;
 if (privatePath) {
  const result = payload(await deps.get(`${privatePath}?resolve=1`));
  if (typeof result.url !== "string") throw new Error("Server nije vratio adresu dokumenta.");
  await deps.openUrl(httpUrl(result.url, base.origin).toString());
  return;
 }
 throw new Error("Ovaj prikaz dokumenta još nije podržan u aplikaciji.");
}
