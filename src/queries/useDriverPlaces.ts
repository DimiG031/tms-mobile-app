import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type PlaceType = "PARKING" | "FUEL" | "REST" | "PAUSE" | "FOOD" | "WASH" | "OTHER";
export type PlaceVisibility = "PRIVATE" | "COMPANY" | "GLOBAL";
export type PlaceStatus = "ACTIVE" | "STALE" | "HIDDEN";

export type AmenityKey =
  | "parking"
  | "toilet"
  | "shower"
  | "restaurant"
  | "wifi"
  | "atm"
  | "fuel"
  | "store"
  | "lodging"
  | "bigParking"
  | "guarded"
  | "truckWash";

export type AmenityMap = Partial<Record<AmenityKey, boolean>>;

export type Place = {
  id: string;
  type: PlaceType | string;
  name: string | null;
  latitude: number;
  longitude: number;
  amenities: AmenityMap;
  note: string | null;
  visibility: PlaceVisibility | string;
  status: PlaceStatus | string;
  confirmCount: number;
  disputeCount: number;
  netScore: number;
  rating: number | null;
  ratingCount: number;
  author: string | null;
  canEdit: boolean;
  myVote: 1 | -1 | null;
  myRating: number | null;
  distanceM: number | null;
  lastConfirmedAt: string | null;
  updatedAt: string | null;
  photos?: PlacePhoto[];
  images?: string[];
  reportCount?: number;
  amenityStats?: Record<string, AmenityStat>;
};

export type PlacePhoto = { id: string; url: string };
export type AmenityStat = { confirms: number; disputes: number; net: number };

export type NearbyCandidate = Place & { likelySame: boolean };

export type PlaceInput = {
  type: PlaceType;
  latitude: number;
  longitude: number;
  name?: string | null;
  note?: string | null;
  visibility?: "PRIVATE" | "COMPANY";
  amenities?: AmenityMap;
  rating?: number | null;
};

function unwrapItems<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  const raw = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)
    ? (data as { items: unknown[] }).items
    : [];
  return raw.filter((item): item is T => Boolean(item) && typeof item === "object");
}

export function useDriverPlaces(args: {
  lat?: number | null;
  lng?: number | null;
  radius?: number;
  types?: PlaceType[];
}) {
  const { lat, lng, radius, types } = args;
  const typesKey = types && types.length ? [...types].sort().join(",") : "";
  return useQuery({
    queryKey: ["driver-places", lat ?? null, lng ?? null, radius ?? null, typesKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (lat != null && lng != null) params.set("near", `${lat},${lng}`);
      if (radius != null) params.set("radius", String(radius));
      if (typesKey) params.set("types", typesKey);
      const qs = params.toString();
      const result = await api.get<unknown>(`/api/mobile/places${qs ? `?${qs}` : ""}`);
      return unwrapItems<Place>(result);
    },
    staleTime: 60_000
  });
}

export async function fetchNearbyCandidates(
  lat: number,
  lng: number,
  type: PlaceType,
  name?: string | null
): Promise<NearbyCandidate[]> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng), type });
  if (name && name.trim()) params.set("name", name.trim());
  const result = await api.get<unknown>(`/api/mobile/places/nearby?${params.toString()}`);
  const data = (result as { data?: { candidates?: unknown[] } }).data;
  const raw = Array.isArray(data?.candidates) ? data!.candidates : [];
  return raw.filter((item): item is NearbyCandidate => Boolean(item) && typeof item === "object");
}

function buildBody(input: Partial<PlaceInput>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.type !== undefined) body.type = input.type;
  if (input.latitude !== undefined) body.latitude = input.latitude;
  if (input.longitude !== undefined) body.longitude = input.longitude;
  if (input.name !== undefined) body.name = input.name?.trim() || null;
  if (input.note !== undefined) body.note = input.note?.trim() || null;
  if (input.visibility !== undefined) body.visibility = input.visibility;
  if (input.amenities !== undefined) body.amenities = input.amenities;
  if (input.rating !== undefined && input.rating != null) body.rating = input.rating;
  return body;
}

export function useCreatePlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlaceInput) => api.post<{ data: Place }>("/api/mobile/places", buildBody(input)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["driver-places"] });
    }
  });
}

export function useUpdatePlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; data: Partial<PlaceInput> }) =>
      api.patch<{ data: Place }>(`/api/mobile/places/${params.id}`, buildBody(params.data)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["driver-places"] });
    }
  });
}

export function useDeletePlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/api/mobile/places/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["driver-places"] });
    }
  });
}

export function useConfirmPlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; vote: 1 | -1; rating?: number | null }) => {
      const body: Record<string, unknown> = { vote: params.vote };
      if (params.rating != null) body.rating = params.rating;
      return api.post<{ data: Place }>(`/api/mobile/places/${params.id}/confirm`, body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["driver-places"] });
    }
  });
}

export function useAddPlacePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; url: string }) =>
      api.post<{ data: { photo: PlacePhoto; photos: PlacePhoto[] } }>(`/api/mobile/places/${params.id}/photos`, { url: params.url }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["driver-places"] });
    }
  });
}

export function useDeletePlacePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; photoId: string }) =>
      api.delete<{ data: { photos: PlacePhoto[] } }>(`/api/mobile/places/${params.id}/photos/${params.photoId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["driver-places"] });
    }
  });
}

export function useReportPlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; reason?: string | null }) => {
      const body: Record<string, unknown> = {};
      if (params.reason && params.reason.trim()) body.reason = params.reason.trim();
      return api.post<{ data: { reportCount: number } }>(`/api/mobile/places/${params.id}/report`, body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["driver-places"] });
    }
  });
}

export function useAmenityVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; key: AmenityKey; vote: 1 | -1 }) =>
      api.post<{ data: { amenityStats: Record<string, AmenityStat> } }>(`/api/mobile/places/${params.id}/amenity-vote`, {
        key: params.key,
        vote: params.vote
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["driver-places"] });
    }
  });
}
