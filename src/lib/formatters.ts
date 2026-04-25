const srDateFormatter = new Intl.DateTimeFormat("sr-RS", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const srDateTimeFormatter = new Intl.DateTimeFormat("sr-RS", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const MONTHS_SR = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];

export function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return srDateFormatter.format(date);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return srDateTimeFormatter.format(date);
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
  if (status === "PLANNED")    return "Planirano";
  if (status === "CONFIRMED")  return "Potvrđeno";
  if (status === "IN_TRANSIT") return "U tranzitu";
  if (status === "COMPLETED")  return "Završeno";
  if (status === "CANCELLED")  return "Otkazano";
  return status ?? "-";
}

export function tourStatusClass(status?: string | null): string {
  if (status === "PLANNED")    return "bg-slate-100 text-slate-700";
  if (status === "CONFIRMED")  return "bg-blue-100 text-blue-700";
  if (status === "IN_TRANSIT") return "bg-amber-100 text-amber-700";
  if (status === "COMPLETED")  return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export function translateSeverity(severity?: string | null): string {
  if (severity === "critical") return "Kritično";
  if (severity === "warning")  return "Upozorenje";
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
    to:   parts[1] ?? "Odredište"
  };
}
