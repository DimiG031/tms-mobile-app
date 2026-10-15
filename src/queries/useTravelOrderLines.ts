import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Red „tabele kretanja" iz obrasca SERIJA B. Sva polja su opciona —
// prazno znači da vozač taj podatak nije uneo.
export type TravelOrderLine = {
  id?: string;
  date: string | null;
  odometer: number | null;
  fromPlace: string | null;
  toPlace: string | null;
  departAt: string | null;
  arriveAt: string | null;
  loadAt: string | null;
  unloadAt: string | null;
  delayMinutes: number | null;
  delayCause: string | null;
  kmDone: number | null;
  cargoKgVehicle: number | null;
  cargoKgTrailer: number | null;
  tkm: number | null;
  freightDocNo: string | null;
  note: string | null;
};

export function emptyTravelOrderLine(date: Date = new Date()): TravelOrderLine {
  return {
    date: date.toISOString(),
    odometer: null,
    fromPlace: null,
    toPlace: null,
    departAt: null,
    arriveAt: null,
    loadAt: null,
    unloadAt: null,
    delayMinutes: null,
    delayCause: null,
    kmDone: null,
    cargoKgVehicle: null,
    cargoKgTrailer: null,
    tkm: null,
    freightDocNo: null,
    note: null
  };
}

function unwrapLines(payload: unknown): TravelOrderLine[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  const raw =
    data && typeof data === "object" && Array.isArray((data as { lines?: unknown }).lines)
      ? (data as { lines: unknown[] }).lines
      : [];
  return raw.filter((item): item is TravelOrderLine => Boolean(item) && typeof item === "object");
}

export function useTravelOrderLines(orderId?: string | null) {
  return useQuery({
    queryKey: ["travel-order-lines", orderId ?? null],
    enabled: Boolean(orderId),
    queryFn: async () => {
      const result = await api.get<unknown>(`/api/mobile/travel-orders/${orderId}/lines`);
      return unwrapLines(result);
    },
    staleTime: 30_000
  });
}

// Backend očekuje PUN niz redova — snimanje zamenjuje sve prethodne.
export function useSaveTravelOrderLines() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { orderId: string; lines: TravelOrderLine[] }) =>
      api.put<{ ok: boolean }>(`/api/mobile/travel-orders/${params.orderId}/lines`, {
        lines: params.lines.map(({ id: _id, ...line }) => line)
      }),
    onSuccess: async (_data, params) => {
      await queryClient.invalidateQueries({ queryKey: ["travel-order-lines", params.orderId] });
    }
  });
}
