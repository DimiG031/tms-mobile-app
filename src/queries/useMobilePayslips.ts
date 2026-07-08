import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type PayslipSummary = {
  id: string;
  year: number | null;
  month: number | null;
  periodLabel: string;
  net: number | null;
  gross: number | null;
  currency: string;
  status: string | null;
};

export type PayslipItem = {
  label: string;
  type: string | null;
  amount: number | null;
  currency: string | null;
};

export type PayslipDetail = PayslipSummary & {
  items: PayslipItem[];
  pdfUrl: string | null;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickNum(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

const MONTHS_SR = ["Januar", "Februar", "Mart", "April", "Maj", "Jun", "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar"];

function periodLabelFor(year: number | null, month: number | null, fallback: string | null): string {
  if (fallback) return fallback;
  if (month && month >= 1 && month <= 12) return `${MONTHS_SR[month - 1]}${year ? ` ${year}` : ""}`;
  return year ? String(year) : "Obračun";
}

function normalizeSummary(raw: unknown): PayslipSummary | null {
  const obj = asObject(raw);
  if (!obj) return null;
  const id = pickStr(obj, ["id", "payrollId", "_id"]);
  if (!id) return null;
  const year = pickNum(obj, ["year", "godina"]);
  const month = pickNum(obj, ["month", "mesec"]);
  return {
    id,
    year,
    month,
    periodLabel: periodLabelFor(year, month, pickStr(obj, ["periodLabel", "period", "label"])),
    net: pickNum(obj, ["net", "netAmount", "neto", "netoIznos"]),
    gross: pickNum(obj, ["gross", "grossAmount", "bruto", "brutoIznos"]),
    currency: pickStr(obj, ["currency", "valuta"]) ?? "RSD",
    status: pickStr(obj, ["status"])
  };
}

function normalizeItems(raw: unknown): PayslipItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const obj = asObject(entry);
      if (!obj) return null;
      return {
        label: pickStr(obj, ["label", "name", "naziv", "opis", "description"]) ?? "Stavka",
        type: pickStr(obj, ["type", "kind", "category", "vrsta"]),
        amount: pickNum(obj, ["amount", "iznos", "value", "total"]),
        currency: pickStr(obj, ["currency", "valuta"])
      } satisfies PayslipItem;
    })
    .filter((item): item is PayslipItem => Boolean(item));
}

function unwrapList(payload: unknown): unknown[] {
  const root = asObject(payload);
  const data = root?.data;
  if (Array.isArray(data)) return data;
  const dataObj = asObject(data);
  if (dataObj && Array.isArray(dataObj.items)) return dataObj.items;
  return [];
}

export function useMobilePayslips(year: number) {
  return useQuery({
    queryKey: ["payslips", year],
    queryFn: async () => {
      const result = await api.get<unknown>(`/api/mobile/me/payslips?year=${year}`);
      return unwrapList(result)
        .map(normalizeSummary)
        .filter((item): item is PayslipSummary => Boolean(item))
        .sort((a, b) => (b.month ?? 0) - (a.month ?? 0));
    },
    staleTime: 5 * 60_000
  });
}

export type PerDiemBreakdownRow = { nalog: string | null; zemlja: string | null; dana: number | null; iznos: number | null };

export type PerDiemPayout = {
  id: string;
  year: number | null;
  month: number | null;
  periodLabel: string;
  amount: number | null;
  currency: string;
  status: string | null;
  note: string | null;
  breakdown: PerDiemBreakdownRow[];
};

function normalizePerDiem(raw: unknown): PerDiemPayout | null {
  const obj = asObject(raw);
  if (!obj) return null;
  const id = pickStr(obj, ["id", "_id"]);
  if (!id) return null;
  const year = pickNum(obj, ["year", "godina"]);
  const month = pickNum(obj, ["month", "mesec"]);
  const breakdownRaw = Array.isArray(obj.breakdown) ? obj.breakdown : [];
  const breakdown: PerDiemBreakdownRow[] = breakdownRaw
    .map((entry) => {
      const row = asObject(entry);
      if (!row) return null;
      return {
        nalog: pickStr(row, ["nalog", "order", "orderCode", "travelOrder"]),
        zemlja: pickStr(row, ["zemlja", "country"]),
        dana: pickNum(row, ["dana", "days"]),
        iznos: pickNum(row, ["iznos", "amount"])
      } satisfies PerDiemBreakdownRow;
    })
    .filter((row): row is PerDiemBreakdownRow => Boolean(row));
  return {
    id,
    year,
    month,
    periodLabel: periodLabelFor(year, month, pickStr(obj, ["periodLabel", "period", "label"])),
    amount: pickNum(obj, ["amount", "iznos", "total"]),
    currency: pickStr(obj, ["currency", "valuta"]) ?? "RSD",
    status: pickStr(obj, ["status"]),
    note: pickStr(obj, ["note", "napomena"]),
    breakdown
  };
}

export function useMobilePerDiem(year: number) {
  return useQuery({
    queryKey: ["per-diem", year],
    queryFn: async () => {
      const result = await api.get<unknown>(`/api/mobile/me/per-diem?year=${year}`);
      return unwrapList(result)
        .map(normalizePerDiem)
        .filter((item): item is PerDiemPayout => Boolean(item))
        .sort((a, b) => (b.month ?? 0) - (a.month ?? 0));
    },
    staleTime: 5 * 60_000
  });
}

export function useMobilePayslip(id: string | null) {
  return useQuery({
    queryKey: ["payslip", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const result = await api.get<unknown>(`/api/mobile/me/payslips/${id}`);
      const data = asObject((result as { data?: unknown }).data) ?? {};
      const summary = normalizeSummary(data);
      return {
        ...(summary ?? {
          id: id ?? "",
          year: null,
          month: null,
          periodLabel: "Obračun",
          net: null,
          gross: null,
          currency: "RSD",
          status: null
        }),
        items: normalizeItems(data.items ?? data.stavke),
        pdfUrl: pickStr(data, ["pdfUrl", "pdf", "documentUrl", "fileUrl"])
      } satisfies PayslipDetail;
    },
    staleTime: 5 * 60_000,
    retry: 1
  });
}
