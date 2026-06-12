const MONTHS_SR = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];

export function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}.${m}.${date.getFullYear()}.`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${d}.${m}.${date.getFullYear()}. ${h}:${min}`;
}

export function formatTourDateRange(value?: string | null): string {
  if (!value) return "-";
  const parts = value.split(" - ").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return value;
  if (parts.length === 1) return formatDateTime(parts[0]);
  return `${formatDateTime(parts[0])} - ${formatDateTime(parts[1])}`;
}

export function formatTourDateShort(value?: string | null): string {
  if (!value) return "-";
  const firstPart = value.split(" - ")[0]?.trim() ?? value;
  const date = new Date(firstPart);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getDate()}. ${MONTHS_SR[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatMoney(value?: number | null, currency: string = "EUR"): string {
  if (value == null || Number.isNaN(value)) return `0 ${currency}`;
  return `${value.toFixed(2)} ${currency}`;
}

export function translateTourStatus(status?: string | null): string {
  const normalized = status?.toUpperCase();
  if (normalized === "PLANNED") return "Planirano";
  if (normalized === "CONFIRMED") return "Potvrđeno";
  if (normalized === "IN_TRANSIT") return "U tranzitu";
  if (normalized === "COMPLETED") return "Završeno";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "Otkazano";
  return status ?? "-";
}

export function tourStatusClass(status?: string | null): string {
  const normalized = status?.toUpperCase();
  if (normalized === "PLANNED") return "bg-slate-100 text-slate-700";
  if (normalized === "CONFIRMED") return "bg-blue-100 text-blue-700";
  if (normalized === "IN_TRANSIT") return "bg-amber-100 text-amber-700";
  if (normalized === "COMPLETED") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export function translateExpenseStatus(status?: string | null): string {
  const normalized = status?.toUpperCase();
  if (normalized === "OPEN") return "Otvoren";
  if (normalized === "SUBMITTED") return "Predat";
  if (normalized === "REVISED") return "Izmenjen";
  if (normalized === "CONFIRMED") return "Potvrđen";
  if (normalized === "APPROVED") return "Odobren";
  if (normalized === "CLOSED") return "Zatvoren";
  return status ?? "-";
}

export function translateSeverity(severity?: string | null): string {
  if (severity === "critical") return "Kritično";
  if (severity === "warning") return "Upozorenje";
  return "Informacija";
}

export function formatRouteLabel(value?: string | null): string {
  if (!value) return "Bez relacije";
  const normalized = value.replaceAll(/\s*(?:->|→)\s*/g, " → ").trim();
  return normalized || "Bez relacije";
}

export function splitRouteLabel(value?: string | null): { from: string; to: string } {
  const normalized = formatRouteLabel(value);
  const parts = normalized.split("→").map((part) => part.trim()).filter(Boolean);
  return {
    from: parts[0] ?? "Polazište",
    to: parts[1] ?? "Odredište"
  };
}
