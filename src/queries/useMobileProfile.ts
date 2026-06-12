import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MobileModuleKey, MobileProfile, MobileProfilePreferences } from "@/lib/types";

type Response = { ok: true; data: MobileProfile };
type PreferencesResponse = {
  ok: true;
  data: {
    preferences: MobileProfilePreferences;
    availableMobileModules: MobileModuleKey[];
  };
};

export type UpdateMobilePreferencesInput = MobileProfilePreferences;

export function useMobileProfile(enabled = true) {
  return useQuery({
    queryKey: ["mobile-profile"],
    queryFn: async () => {
      const result = await api.get<Response>("/api/mobile/profile");
      if (!result.ok) throw new Error("Greška pri učitavanju mobilnog profila.");
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled
  });
}

export function useUpdateMobilePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateMobilePreferencesInput) => {
      const result = await api.patch<PreferencesResponse>("/api/mobile/preferences", payload);
      if (!result.ok) throw new Error("Greška pri čuvanju podešavanja navigacije.");
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mobile-profile"] });
    }
  });
}
