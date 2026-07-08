import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { formatMoney } from "@/lib/formatters";
import type { PayslipDetail, PerDiemPayout } from "@/queries/useMobilePayslips";

function esc(value: string | null | undefined): string {
  return (value ?? "").replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

function statusLabel(status?: string | null): string {
  const s = status?.toUpperCase();
  if (s === "PAID" || s === "ISPLACENO") return "Isplaćeno";
  if (s === "FINALIZED" || s === "APPROVED" || s === "CONFIRMED") return "Konačan";
  if (s === "DRAFT") return "Nacrt";
  return status ?? "";
}

const BASE_STYLE = `
  <style>
    * { font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; box-sizing: border-box; }
    body { padding: 28px; color: #0f172a; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .sub { color: #64748b; font-size: 13px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td { padding: 9px 4px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    td.amt { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .neg { color: #dc2626; }
    .total td { border-top: 2px solid #cbd5e1; border-bottom: none; font-weight: 700; font-size: 16px; padding-top: 12px; }
    .muted { color: #94a3b8; font-size: 12px; margin-top: 24px; }
  </style>
`;

export function payslipHtml(d: PayslipDetail): string {
  const rows = d.items
    .map((it) => {
      const neg = (it.amount ?? 0) < 0;
      const amount = it.amount != null ? esc(formatMoney(it.amount, it.currency ?? d.currency)) : "—";
      return `<tr><td>${esc(it.label)}</td><td class="amt ${neg ? "neg" : ""}">${amount}</td></tr>`;
    })
    .join("");
  const gross = d.gross != null ? ` · Bruto: ${esc(formatMoney(d.gross, d.currency))}` : "";
  const net = d.net != null ? esc(formatMoney(d.net, d.currency)) : "—";
  return `<html><head><meta charset="utf-8"/>${BASE_STYLE}</head><body>
    <h1>Platni listić — ${esc(d.periodLabel)}</h1>
    <div class="sub">Status: ${esc(statusLabel(d.status))}${gross}</div>
    <table>
      ${rows}
      <tr class="total"><td>Za isplatu (neto)</td><td class="amt">${net}</td></tr>
    </table>
    <p class="muted">Dnevnice se prikazuju u zasebnom dokumentu (neoporezivo).</p>
  </body></html>`;
}

export function perDiemHtml(p: PerDiemPayout): string {
  const rows = p.breakdown
    .map((r) => {
      const title = [r.nalog, r.zemlja].filter(Boolean).join(" · ") || "Stavka";
      const days = r.dana != null ? ` <span class="muted" style="margin:0">(${r.dana} ${r.dana === 1 ? "dan" : "dana"})</span>` : "";
      const amount = r.iznos != null ? esc(formatMoney(r.iznos, p.currency)) : "—";
      return `<tr><td>${esc(title)}${days}</td><td class="amt">${amount}</td></tr>`;
    })
    .join("");
  const total = p.amount != null ? esc(formatMoney(p.amount, p.currency)) : "—";
  const note = p.note ? `<div class="sub">${esc(p.note)}</div>` : "";
  return `<html><head><meta charset="utf-8"/>${BASE_STYLE}</head><body>
    <h1>Dnevnice (neoporezivo) — ${esc(p.periodLabel)}</h1>
    ${note}
    <table>
      ${rows}
      <tr class="total"><td>Ukupno dnevnice</td><td class="amt">${total}</td></tr>
    </table>
  </body></html>`;
}

export async function sharePdfFromHtml(html: string, dialogTitle: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle, UTI: "com.adobe.pdf" });
  }
}
