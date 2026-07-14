import { formatMoney } from "@/lib/formatters";
import type { PayslipDetail, PerDiemPayout } from "@/queries/useMobilePayslips";

export type PdfHeader = {
  name: string | null;
  company: string | null;
  address: string | null;
};

function esc(value: string | null | undefined): string {
  const s = value ?? "";
  return s.replace(/[&<>]/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    return "&gt;";
  });
}

function val(value: string | null | undefined): string {
  const s = (value ?? "").trim();
  return s ? esc(s) : "—";
}

function statusLabel(status?: string | null): string {
  const s = status?.toUpperCase();
  if (s === "PAID" || s === "ISPLACENO") return "Isplaćeno";
  if (s === "FINALIZED" || s === "APPROVED" || s === "CONFIRMED") return "Konačan";
  if (s === "DRAFT") return "Nacrt";
  return status ?? "—";
}

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}.`;
}

const ACCENT = "#0d7d72";

const BASE_STYLE = `
  <style>
    * { font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; color: #0f172a; }
    .page { max-width: 760px; margin: 0 auto; padding: 34px 36px 28px; }
    .topbar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${ACCENT}; padding-bottom: 14px; }
    .brand .co { font-size: 21px; font-weight: 800; color: ${ACCENT}; letter-spacing: .2px; }
    .brand .co-sub { color: #64748b; font-size: 12px; margin-top: 3px; }
    .doctype { text-align: right; }
    .badge { display: inline-block; background: ${ACCENT}; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 1.4px; padding: 6px 13px; border-radius: 6px; }
    .doctype .period { margin-top: 8px; font-size: 15px; font-weight: 700; }
    .doctype .st { margin-top: 3px; font-size: 12px; color: #64748b; }
    .parties { display: flex; gap: 16px; margin-top: 22px; }
    .party { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; }
    .party .k { font-size: 10px; text-transform: uppercase; letter-spacing: .7px; color: #94a3b8; }
    .party .v { font-size: 14px; font-weight: 600; margin-top: 3px; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 24px; }
    table.items thead th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .7px; color: #64748b; border-bottom: 2px solid #cbd5e1; padding: 0 6px 9px; }
    table.items thead th.amt { text-align: right; }
    table.items thead th.mid { text-align: center; }
    table.items td { padding: 11px 6px; border-bottom: 1px solid #eef2f6; font-size: 14px; }
    table.items td.amt { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 600; }
    table.items td.mid { text-align: center; color: #64748b; }
    .neg { color: #dc2626; }
    .grossline { margin-top: 12px; text-align: right; color: #64748b; font-size: 13px; }
    .totalbox { margin-top: 14px; display: flex; justify-content: space-between; align-items: center; background: ${ACCENT}; color: #fff; border-radius: 12px; padding: 15px 20px; }
    .totalbox .tl { font-size: 14px; font-weight: 600; opacity: .95; }
    .totalbox .tv { font-size: 23px; font-weight: 800; letter-spacing: .3px; }
    .note { color: #64748b; font-size: 12px; margin-top: 16px; line-height: 1.5; }
    .foot { margin-top: 26px; border-top: 1px solid #e2e8f0; padding-top: 10px; color: #94a3b8; font-size: 11px; display: flex; justify-content: space-between; }
  </style>
`;

function topbar(header: PdfHeader | undefined, doctype: string, periodLabel: string, statusText?: string): string {
  const company = header?.company?.trim() || "TMS";
  const st = statusText ? `<div class="st">${esc(statusText)}</div>` : "";
  return `<div class="topbar">
    <div class="brand">
      <div class="co">${esc(company)}</div>
      <div class="co-sub">${doctype === "OBRAČUN DNEVNICA" ? "Obračun dnevnica" : "Obračun zarade zaposlenog"}</div>
    </div>
    <div class="doctype">
      <span class="badge">${esc(doctype)}</span>
      <div class="period">${esc(periodLabel)}</div>
      ${st}
    </div>
  </div>`;
}

function parties(header?: PdfHeader): string {
  if (!header) return "";
  return `<div class="parties">
    <div class="party"><div class="k">Zaposleni</div><div class="v">${val(header.name)}</div></div>
    <div class="party"><div class="k">Adresa</div><div class="v">${val(header.address)}</div></div>
  </div>`;
}

function foot(): string {
  return `<div class="foot"><span>Generisano: ${todayStr()}</span><span>TMS aplikacija</span></div>`;
}

export function payslipHtml(d: PayslipDetail, header?: PdfHeader): string {
  const rows = d.items
    .map((it) => {
      const neg = (it.amount ?? 0) < 0;
      const amount = it.amount != null ? esc(formatMoney(it.amount, it.currency ?? d.currency)) : "—";
      const sub = it.installment ? `<div style="color:#94a3b8;font-size:11.5px;margin-top:2px">${esc(it.installment)} rata</div>` : "";
      return `<tr><td>${esc(it.label)}${sub}</td><td class="amt ${neg ? "neg" : ""}">${amount}</td></tr>`;
    })
    .join("");
  const body = rows || `<tr><td colspan="2" style="color:#94a3b8;padding:14px 6px">Stavke nisu dostupne.</td></tr>`;
  const gross = d.gross != null ? `<div class="grossline">Bruto 1: <b>${esc(formatMoney(d.gross, d.currency))}</b></div>` : "";
  const net = d.net != null ? esc(formatMoney(d.net, d.currency)) : "—";
  return `<html><head><meta charset="utf-8"/>${BASE_STYLE}</head><body>
    <div class="page">
      ${topbar(header, "PLATNI LISTIĆ", d.periodLabel, `Status: ${statusLabel(d.status)}`)}
      ${parties(header)}
      <table class="items">
        <thead><tr><th>Stavka</th><th class="amt">Iznos</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
      ${gross}
      <div class="totalbox"><span class="tl">Za isplatu (neto)</span><span class="tv">${net}</span></div>
      <div class="note">Dnevnice se obračunavaju i prikazuju u zasebnom dokumentu, odvojeno od zarade.</div>
      ${foot()}
    </div>
  </body></html>`;
}

export function perDiemHtml(p: PerDiemPayout, header?: PdfHeader): string {
  const rows = p.breakdown
    .map((r) => {
      const title = [r.nalog, r.zemlja].filter(Boolean).join(" · ") || "Stavka";
      const days = r.dana != null ? `${r.dana} ${r.dana === 1 ? "dan" : "dana"}` : "—";
      const amount = r.iznos != null ? esc(formatMoney(r.iznos, p.currency)) : "—";
      return `<tr><td>${esc(title)}</td><td class="mid">${days}</td><td class="amt">${amount}</td></tr>`;
    })
    .join("");
  const body = rows || `<tr><td colspan="3" style="color:#94a3b8;padding:14px 6px">Nema razrade po turi.</td></tr>`;
  const total = p.amount != null ? esc(formatMoney(p.amount, p.currency)) : "—";
  const note = p.note ? `<div class="note">${esc(p.note)}</div>` : "";
  return `<html><head><meta charset="utf-8"/>${BASE_STYLE}</head><body>
    <div class="page">
      ${topbar(header, "OBRAČUN DNEVNICA", p.periodLabel)}
      ${parties(header)}
      <table class="items">
        <thead><tr><th>Ruta (nalog · zemlja)</th><th class="mid">Dani</th><th class="amt">Iznos</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
      <div class="totalbox"><span class="tl">Ukupno dnevnice</span><span class="tv">${total}</span></div>
      ${note}
      ${foot()}
    </div>
  </body></html>`;
}

async function loadPdfModules() {
  try {
    const Print = await import("expo-print");
    const Sharing = await import("expo-sharing");
    return { Print, Sharing };
  } catch {
    // Native modul nije u ovom build-u (npr. stari dev client).
    return null;
  }
}

export async function sharePdfFromHtml(html: string, dialogTitle: string): Promise<void> {
  const mods = await loadPdfModules();
  if (!mods) {
    throw new Error("PDF izvoz nije dostupan u ovoj verziji aplikacije. Ažuriraj na najnoviji build.");
  }
  const { uri } = await mods.Print.printToFileAsync({ html });
  if (await mods.Sharing.isAvailableAsync()) {
    await mods.Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle, UTI: "com.adobe.pdf" });
  }
}
