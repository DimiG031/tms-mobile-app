import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MobileThemePreference } from "@/lib/types";
import { changeOwnPassword } from "@/services/password";

export function useChangePassword() {
  return useMutation({
    mutationFn: changeOwnPassword
  });
}

export type MobileSettingsInput = {
  theme?: MobileThemePreference;
  notifyEmail?: boolean;
  notifyWeb?: boolean;
  notifyMobile?: boolean;
};

export function useUpdateMobileSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MobileSettingsInput) => {
      await api.patch("/api/mobile/settings", input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mobile-profile"] });
    }
  });
}
