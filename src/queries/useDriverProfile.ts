import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DriverProfile } from "@/lib/types";

type DriverProfileResponse = {
  ok: true;
  data: DriverProfile;
};

export function useDriverProfile(driverId?: string | null) {
  return useQuery({
    queryKey: ["driver-profile", driverId],
    queryFn: async () => {
      if (!driverId) return null;
      const result = await api.get<DriverProfileResponse>(`/api/drivers/${driverId}`);
      return result.data;
    },
    enabled: Boolean(driverId),
    staleTime: 10 * 60 * 1000
  });
}
