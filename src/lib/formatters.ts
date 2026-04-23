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
  minute: "2-digit"
});

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

export function formatMoney(value?: number | null, currency: string = "EUR"): string {
  if (value == null || Number.isNaN(value)) return `0 ${currency}`;
  return `${value.toFixed(2)} ${currency}`;
}

export function translateTourStatus(status?: string | null): string {
  if (status === "PLANNED") return "Planirano";
  if (status === "CONFIRMED") return "Potvrdjeno";
  if (status === "IN_TRANSIT") return "U transportu";
  if (status === "COMPLETED") return "Zavrseno";
  return status ?? "-";
}

export function tourStatusClass(status?: string | null): string {
  if (status === "PLANNED") return "bg-slate-100 text-slate-700";
  if (status === "CONFIRMED") return "bg-blue-100 text-blue-700";
  if (status === "IN_TRANSIT") return "bg-amber-100 text-amber-700";
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export function translateSeverity(severity?: string | null): string {
  if (severity === "critical") return "Kriticno";
  if (severity === "warning") return "Upozorenje";
  return "Informacija";
}

