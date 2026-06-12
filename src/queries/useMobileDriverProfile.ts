import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MobileDriverProfile } from "@/lib/types";

type Response = { ok: true; data: MobileDriverProfile };

export function useMobileDriverProfile(enabled = true) {
  return useQuery({
    queryKey: ["mobile-driver-profile"],
    queryFn: async () => {
      const result = await api.get<Response>("/api/mobile/driver-profile");
      if (!result.ok) throw new Error("Greška pri učitavanju profila vozača.");
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled
  });
}
