import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TravelOrderStatus = "OPEN" | "ON_ROAD" | "RETURNED" | "CLOSED" | string;

export type TravelEventType = "BORDER" | "LOAD" | "UNLOAD" | "FUEL" | "ODOMETER" | "REST" | "NOTE";

export type TravelOrderEvent = {
  id: string;
  type: TravelEventType | string;
  at: string | null;
  location: string | null;
  countryFrom: string | null;
  countryTo: string | null;
  fuelLiters: number | null;
  fuelAmount: number | null;
  currency: string | null;
  odometer: number | null;
  note: string | null;
};

export type TravelOrder = {
  id: string;
  number: string | null;
  status: TravelOrderStatus;
  origin: string | null;
  vehicleId: string | null;
  driverId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  route: string | null;
  odoStart: number | null;
  odoEnd: number | null;
  events: TravelOrderEvent[];
};

export type Country = { id: string; name: string; code: string | null };
export type CompanyLocation = {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
};

export type TravelEventInput = {
  type: TravelEventType;
  at?: string | null;
  location?: string | null;
  countryFrom?: string | null;
  countryTo?: string | null;
  locationId?: string | null;
  odometer?: number | null;
  fuelLiters?: number | null;
  fuelAmount?: number | null;
  currency?: string | null;
  note?: string | null;
};

export type TravelReturnInput = {
  odoEnd?: number | null;
  note?: string | null;
};

function unwrapItems<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { data?: unknown };
  const raw = Array.isArray(root.data)
    ? root.data
    : root.data && typeof root.data === "object" && Array.isArray((root.data as { items?: unknown }).items)
    ? (root.data as { items: unknown[] }).items
    : [];
  return raw.filter((item): item is T => Boolean(item) && typeof item === "object");
}

function normalizeOrder(raw: TravelOrder): TravelOrder {
  return {
    ...raw,
    events: Array.isArray(raw.events)
      ? [...raw.events].sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""))
      : []
  };
}

export function useTravelOrders() {
  return useQuery({
    queryKey: ["travel-orders"],
    queryFn: async () => {
      const result = await api.get<unknown>("/api/mobile/travel-orders");
      return unwrapItems<TravelOrder>(result).map(normalizeOrder);
    },
    staleTime: 30_000
  });
}

export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const result = await api.get<unknown>("/api/countries?limit=100");
      return unwrapItems<Country>(result).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "sr"));
    },
    staleTime: 60 * 60_000
  });
}

export function useCompanyLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const result = await api.get<unknown>("/api/locations?limit=100");
      return unwrapItems<CompanyLocation>(result);
    },
    staleTime: 30 * 60_000
  });
}

function buildEventPayload(input: TravelEventInput): Record<string, unknown> {
  const payload: Record<string, unknown> = { type: input.type };
  if (input.at) payload.at = input.at;
  if (input.location != null && input.location !== "") payload.location = input.location;
  if (input.countryFrom != null && input.countryFrom !== "") payload.countryFrom = input.countryFrom;
  if (input.countryTo != null && input.countryTo !== "") payload.countryTo = input.countryTo;
  if (input.locationId != null && input.locationId !== "") payload.locationId = input.locationId;
  if (input.odometer != null) payload.odometer = input.odometer;
  if (input.fuelLiters != null) payload.fuelLiters = input.fuelLiters;
  if (input.fuelAmount != null) payload.fuelAmount = input.fuelAmount;
  if (input.currency != null && input.currency !== "") payload.currency = input.currency;
  if (input.note != null && input.note !== "") payload.note = input.note;
  return payload;
}

export function useAddTravelEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { orderId: string; data: TravelEventInput }) => {
      await api.postQueued(`/api/mobile/travel-orders/${params.orderId}/events`, buildEventPayload(params.data));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["travel-orders"] });
    }
  });
}

export function useReturnTravelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { orderId: string; data: TravelReturnInput }) => {
      const payload: Record<string, unknown> = {};
      if (params.data.odoEnd != null) payload.odoEnd = params.data.odoEnd;
      if (params.data.note != null && params.data.note !== "") payload.note = params.data.note;
      await api.postQueued(`/api/mobile/travel-orders/${params.orderId}/return`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["travel-orders"] });
    }
  });
}
