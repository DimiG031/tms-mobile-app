import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type CustomsAmenityItem = {
  key: string;
  label: string;
  details?: string | null;
};

export type CustomsInfo = {
  id: string;
  name: string | null;
  city: string | null;
  country: string | null;
  amenities: Record<string, boolean>;
  amenitiesList: CustomsAmenityItem[];
  workingHours: string | null;
  notes: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

function normalize(payload: unknown): CustomsInfo | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as { data?: unknown };
  const data = (root.data ?? payload) as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object" || typeof data.id !== "string") return null;

  const amenities = (data.amenities && typeof data.amenities === "object" ? data.amenities : {}) as Record<string, boolean>;
  const amenitiesList = Array.isArray(data.amenitiesList) ? (data.amenitiesList as CustomsAmenityItem[]) : [];
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

  return {
    id: data.id,
    name: str(data.name),
    city: str(data.city),
    country: str(data.country),
    amenities,
    amenitiesList,
    workingHours: str(data.workingHours),
    notes: str(data.notes),
    phone: str(data.phone),
    email: str(data.email),
    address: str(data.address)
  };
}

export function useCustomsAmenities(customsOfficeId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["customs", customsOfficeId],
    queryFn: async () => {
      if (!customsOfficeId) return null;
      const result = await api.get<unknown>(`/api/mobile/customs/${encodeURIComponent(customsOfficeId)}`);
      return normalize(result);
    },
    enabled: enabled && Boolean(customsOfficeId),
    staleTime: 10 * 60 * 1000
  });
}
