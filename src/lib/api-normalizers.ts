type MaybePaged<T> = {
  items: T[];
  nextCursor: string | null;
  limit: number;
};

type GenericObject = Record<string, unknown>;

export function normalizeItemsPayload<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as { data?: unknown };
  if (Array.isArray(root.data)) {
    return root.data as T[];
  }

  if (root.data && typeof root.data === "object") {
    const dataObj = root.data as { items?: unknown };
    if (Array.isArray(dataObj.items)) {
      return dataObj.items as T[];
    }
  }

  return [];
}

export function normalizePagedPayload<T>(payload: unknown): MaybePaged<T> {
  if (!payload || typeof payload !== "object") {
    return { items: [], nextCursor: null, limit: 0 };
  }

  const root = payload as { data?: unknown };
  if (Array.isArray(root.data)) {
    return {
      items: root.data as T[],
      nextCursor: null,
      limit: root.data.length
    };
  }

  if (root.data && typeof root.data === "object") {
    const dataObj = root.data as { items?: unknown; nextCursor?: unknown; limit?: unknown };
    if (Array.isArray(dataObj.items)) {
      return {
        items: dataObj.items as T[],
        nextCursor: typeof dataObj.nextCursor === "string" ? dataObj.nextCursor : null,
        limit: typeof dataObj.limit === "number" ? dataObj.limit : dataObj.items.length
      };
    }
  }

  return { items: [], nextCursor: null, limit: 0 };
}

function asObject(value: unknown): GenericObject | null {
  if (!value || typeof value !== "object") return null;
  return value as GenericObject;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function pickString(obj: GenericObject, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(obj[key]);
    if (value) return value;
  }
  return null;
}

function extractRegistration(value: unknown): string | null {
  const nested = asObject(value);
  if (!nested) return null;
  return pickString(nested, ["registration", "label", "name"]);
}

function extractFreightOrderCode(obj: GenericObject): string | null {
  const direct = pickString(obj, ["freightOrderCode", "orderNumber"]);
  if (direct) return direct;

  const freightOrderObj = asObject(obj.freightOrder);
  if (freightOrderObj) {
    const nested = pickString(freightOrderObj, ["orderNumber", "code", "internalRef"]);
    if (nested) return nested;
  }

  if (Array.isArray(obj.freightOrders)) {
    const first = asObject(obj.freightOrders[0]);
    if (first) {
      return pickString(first, ["orderNumber", "code", "internalRef"]);
    }
  }

  return null;
}

function formatDateLabel(startDate: string | null, endDate: string | null): string {
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  return startDate ?? endDate ?? "-";
}

export function normalizeTourSummary(value: unknown) {
  const obj = asObject(value);
  if (!obj) return null;

  const id = asString(obj.id);
  if (!id) return null;

  const routeLabel =
    pickString(obj, ["routeLabel"]) ??
    (() => {
      const start = pickString(obj, ["startLocation", "origin", "from"]);
      const end = pickString(obj, ["endLocation", "destination", "to"]);
      if (start && end) return `${start} -> ${end}`;
      return start ?? end ?? "Bez relacije";
    })();

  const dateLabel =
    pickString(obj, ["dateLabel"]) ??
    formatDateLabel(pickString(obj, ["startDate", "dateFrom"]), pickString(obj, ["endDate", "dateTo"]));

  return {
    id,
    status: pickString(obj, ["status"]) ?? "PLANNED",
    routeLabel,
    dateLabel
  };
}

export function normalizeTourDetailsPayload(payload: unknown) {
  const root = asObject(payload);
  const raw = asObject(root?.data ?? payload);
  if (!raw) return null;

  const summary = normalizeTourSummary(raw);
  if (!summary) return null;

  const vehicleObj = asObject(raw.vehicle);
  const trailerObj = asObject(raw.trailer);

  return {
    ...summary,
    vehicleId: pickString(raw, ["vehicleId"]) ?? asString(vehicleObj?.id),
    vehicleLabel: pickString(raw, ["vehicleLabel", "vehicleRegistration"]) ?? extractRegistration(vehicleObj),
    trailerLabel: pickString(raw, ["trailerLabel", "trailerRegistration"]) ?? extractRegistration(trailerObj),
    freightOrderCode: extractFreightOrderCode(raw),
    notes: pickString(raw, ["notes"])
  };
}
