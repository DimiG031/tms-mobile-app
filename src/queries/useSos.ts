import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type SosInput = {
  tourId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  message?: string | null;
};

export function useSosReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tourId, latitude, longitude, message }: SosInput) => {
      const payload: Record<string, unknown> = {
        timestamp: new Date().toISOString()
      };
      if (tourId) payload.tourId = tourId;
      if (typeof latitude === "number" && Number.isFinite(latitude)) payload.latitude = latitude;
      if (typeof longitude === "number" && Number.isFinite(longitude)) payload.longitude = longitude;
      const trimmedMessage = message?.trim();
      if (trimmedMessage) payload.message = trimmedMessage;

      const result = await api.postQueued("/api/mobile/sos", payload);
      return { queued: result.queued };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}
