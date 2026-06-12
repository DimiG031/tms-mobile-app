import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MobileThemePreference } from "@/lib/types";

export function useChangePassword() {
  return useMutation({
    mutationFn: async (params: { currentPassword: string; newPassword: string }) => {
      await api.patch("/api/mobile/account/password", {
        currentPassword: params.currentPassword,
        newPassword: params.newPassword
      });
    }
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
