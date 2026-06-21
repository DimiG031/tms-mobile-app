import type { Tour, TourStop } from "@/lib/types";

type MaybePaged<T> = {
  items: T[];
  nextCursor: string | null;
  limit: number;
};

type GenericObject = Record<string, unknown>;

type NormalizedDocument = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  relatedType: string;
  relatedId: string;
  tourId: string | null;
  createdAt: string;
};

function formatDateTimeManual(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}. ${hh}:${min}`;
}

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

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pickString(obj: GenericObject, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(obj[key]);
    if (value) return value;
  }
  return null;
}

function pickNumber(obj: GenericObject, keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(obj[key]);
    if (value != null) return value;
  }
  return null;
}

function pickNestedString(obj: GenericObject | null, keys: string[]): string | null {
  if (!obj) return null;
  return pickString(obj, keys);
}

function extractRegistration(value: unknown): string | null {
  const nested = asObject(value);
  if (!nested) return null;
  return pickString(nested, ["registration", "label", "name"]);
}

function extractFreightOrderCode(obj: GenericObject): string | null {
  const direct = pickString(obj, ["freightOrderCode", "orderNumber", "tourNumber", "reference", "code"]);
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

function extractFirstObject(obj: GenericObject, keys: string[]): GenericObject | null {
  for (const key of keys) {
    const direct = asObject(obj[key]);
    if (direct) return direct;

    if (Array.isArray(obj[key])) {
      const first = asObject((obj[key] as unknown[])[0]);
      if (first) return first;
    }
  }

  return null;
}

export function normalizeTourStop(value: unknown, fallbackSequence: number): TourStop | null {
  const obj = asObject(value);
  if (!obj) return null;

  const location = asObject(obj.location) ?? asObject(obj.partner) ?? asObject(obj.company);
  const contact = asObject(obj.contact) ?? asObject(obj.contactPerson);
  const partner = asObject(obj.partner);
  const customsOffice = asObject(obj.customsOffice);
  const freightForwarder = asObject(obj.freightForwarder);
  const partnerCity = asObject(partner?.city);
  const partnerCountry = asObject(partner?.country);
  const customsCity = asObject(customsOffice?.city);
  const customsCountry = asObject(customsCity?.country);
  const forwarderCity = asObject(freightForwarder?.city);
  const forwarderCountry = asObject(forwarderCity?.country);

  return {
    id: pickString(obj, ["id"]) ?? null,
    sequence: pickNumber(obj, ["sequence", "order", "position", "stopNumber"]) ?? fallbackSequence,
    type: pickString(obj, ["stopType", "type", "kind"]),
    locationName:
      pickString(obj, ["locationName", "name", "companyName", "partnerName", "clientName"]) ??
      pickNestedString(partner, ["name"]) ??
      pickNestedString(customsOffice, ["name"]) ??
      pickNestedString(freightForwarder, ["name"]) ??
      pickNestedString(location, ["name", "companyName", "label"]),
    companyName:
      pickString(obj, ["companyName", "partnerName", "clientName"]) ??
      pickNestedString(partner, ["name"]) ??
      pickNestedString(freightForwarder, ["name"]) ??
      pickNestedString(location, ["companyName", "name"]),
    address: pickString(obj, ["address", "street"]) ?? pickNestedString(location, ["address", "street"]),
    city:
      pickString(obj, ["city", "place"]) ??
      pickNestedString(location, ["city", "place"]) ??
      pickNestedString(partnerCity, ["name"]) ??
      pickNestedString(customsCity, ["name"]) ??
      pickNestedString(forwarderCity, ["name"]),
    country:
      pickString(obj, ["country", "countryCode"]) ??
      pickNestedString(location, ["country", "countryCode"]) ??
      pickNestedString(partnerCountry, ["name"]) ??
      pickNestedString(customsCountry, ["name"]) ??
      pickNestedString(forwarderCountry, ["name"]),
    plannedArrivalAt: pickString(obj, ["plannedArrival", "plannedArrivalAt", "arrivalAt", "eta", "unloadingDate"]),
    plannedDepartureAt: pickString(obj, ["plannedDeparture", "plannedDepartureAt", "departureAt", "etd"]),
    contactName: pickString(obj, ["contactName", "contactPerson"]) ?? pickNestedString(contact, ["name"]),
    contactPhone: pickString(obj, ["contactPhone", "phone"]) ?? pickNestedString(contact, ["phone", "mobile"]),
    freightForwarder: pickString(obj, ["freightForwarder"]) ?? pickNestedString(freightForwarder, ["name"]),
    customsOffice: pickString(obj, ["customsOffice"]) ?? pickNestedString(customsOffice, ["name"]),
    customsOfficeId: pickString(obj, ["customsOfficeId"]) ?? pickNestedString(customsOffice, ["id"]),
    driverNote: pickString(obj, ["driverNote", "noteForDriver", "driverNotes", "notes"]),
    status: pickString(obj, ["status"])
  };
}

function normalizeStops(raw: GenericObject) {
  const freightOrder = extractFirstObject(raw, ["freightOrder", "freightOrders"]);
  const source =
    (Array.isArray(raw.routeStops) && raw.routeStops) ||
    (Array.isArray(raw.stops) && raw.stops) ||
    (Array.isArray(raw.tourStops) && raw.tourStops) ||
    (Array.isArray(freightOrder?.routeStops) && freightOrder.routeStops) ||
    (Array.isArray(freightOrder?.stops) && freightOrder.stops) ||
    [];

  return source
    .map((item, index) => normalizeTourStop(item, index + 1))
    .filter((item): item is NonNullable<ReturnType<typeof normalizeTourStop>> => Boolean(item))
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
}

function normalizeForwarder(raw: GenericObject) {
  const freightOrder = extractFirstObject(raw, ["freightOrder", "freightOrders"]);
  const forwarderObj =
    extractFirstObject(raw, ["forwarder", "spedition", "freightForwarder"]) ??
    (freightOrder ? extractFirstObject(freightOrder, ["forwarder", "spedition", "freightForwarder"]) : null);
  const customsObj =
    extractFirstObject(raw, ["customsOffice", "customs", "customsPlace"]) ??
    (freightOrder ? extractFirstObject(freightOrder, ["customsOffice", "customs", "customsPlace"]) : null);

  const name = pickString(raw, ["forwarderName", "speditionName"]) ?? pickNestedString(forwarderObj, ["name", "companyName"]);
  const customsPlace = pickString(raw, ["customsPlace", "customsOfficeName"]) ?? pickNestedString(customsObj, ["name", "place"]);
  const address =
    pickString(raw, ["forwarderAddress", "customsAddress"]) ??
    pickNestedString(forwarderObj, ["address"]) ??
    pickNestedString(customsObj, ["address"]);
  const contact =
    pickString(raw, ["forwarderContact", "customsContact"]) ??
    pickNestedString(forwarderObj, ["contact", "phone"]) ??
    pickNestedString(customsObj, ["contact", "phone"]);
  const note =
    pickString(raw, ["forwarderNote", "customsNote"]) ??
    pickNestedString(forwarderObj, ["note", "notes"]) ??
    pickNestedString(customsObj, ["note", "notes"]);

  if (!name && !customsPlace && !address && !contact && !note) return null;

  return {
    name,
    customsPlace,
    address,
    contact,
    note
  };
}

function normalizeDocuments(raw: GenericObject): NormalizedDocument[] {
  const source =
    (Array.isArray(raw.documents) && raw.documents) ||
    (Array.isArray(raw.tourDocuments) && raw.tourDocuments) ||
    [];

  return source
    .map((value) => {
      const obj = asObject(value);
      if (!obj) return null;
      const fileName = pickString(obj, ["fileName", "name", "title"]);
      const fileUrl = pickString(obj, ["fileUrl", "url", "downloadUrl"]);
      if (!fileName || !fileUrl) return null;

      return {
        id: pickString(obj, ["id"]) ?? fileUrl,
        fileName,
        fileUrl,
        fileType: pickString(obj, ["fileType", "type", "documentType"]) ?? "Dokument",
        fileSize: pickNumber(obj, ["fileSize", "size"]),
        relatedType: pickString(obj, ["relatedType"]) ?? "tour",
        relatedId: pickString(obj, ["relatedId"]) ?? pickString(raw, ["id"]) ?? "",
        tourId: pickString(obj, ["tourId"]) ?? pickString(raw, ["id"]),
        createdAt: pickString(obj, ["createdAt"]) ?? new Date(0).toISOString()
      };
    })
    .filter((item): item is NormalizedDocument => Boolean(item));
}

function formatDateLabel(startDate: string | null, endDate: string | null): string {
  const formatOne = (value: string | null): string | null => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return formatDateTimeManual(value);
  };

  const start = formatOne(startDate);
  const end = formatOne(endDate);
  if (start && end) return `${start} - ${end}`;
  return start ?? end ?? "-";
}

export function normalizeTourSummary(value: unknown): Tour | null {
  const obj = asObject(value);
  if (!obj) return null;

  const id = asString(obj.id);
  if (!id) return null;

  const routeLabel =
    pickString(obj, ["routeLabel"]) ??
    (() => {
      const start = pickString(obj, ["startLocation", "origin", "from"]);
      const end = pickString(obj, ["endLocation", "destination", "to"]);
      if (start && end) return `${start} → ${end}`;
      return start ?? end ?? "Bez relacije";
    })();

  const dateLabel =
    pickString(obj, ["dateLabel"]) ??
    formatDateLabel(pickString(obj, ["startDate", "dateFrom"]), pickString(obj, ["endDate", "dateTo"]));

  return {
    id,
    status: pickString(obj, ["status"]) ?? "PLANNED",
    routeLabel,
    dateLabel,
    distanceKm: pickNumber(obj, [
      "distanceKm",
      "routeDistanceKm",
      "totalDistanceKm",
      "plannedDistanceKm",
      "mileageKm"
    ])
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
    freightOrderCode: extractFreightOrderCode(raw) ?? pickString(raw, ["internalRef"]),
    startLocation: pickString(raw, ["startLocation", "origin", "from"]),
    endLocation: pickString(raw, ["endLocation", "destination", "to"]),
    startDate: pickString(raw, ["startDate", "dateFrom", "plannedStartAt"]),
    endDate: pickString(raw, ["endDate", "dateTo", "plannedEndAt", "completedAt"]),
    notes: pickString(raw, ["notes"]),
    stops: normalizeStops(raw),
    forwarder: normalizeForwarder(raw),
    documents: normalizeDocuments(raw),
    detailedNotes: {
      internalNote: pickString(raw, ["internalNote", "internalNotes", "notes"]),
      driverNote: pickString(raw, ["driverNote", "noteForDriver", "driverNotes", "driverInstructions"]),
      loadingNote: pickString(raw, ["loadingNote", "pickupNote", "loadNote"]),
      unloadingNote: pickString(raw, ["unloadingNote", "deliveryNote", "unloadNote"]),
      customsNote: pickString(raw, ["customsNote", "customsPaymentNote"])
    }
  };
}

