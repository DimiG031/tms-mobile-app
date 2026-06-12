import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TourIssueSeverity, TourIssueType } from "@/lib/types";

export type TourIssueInput = {
  type: TourIssueType;
  title: string;
  description?: string | null;
  stopId?: string | null;
  severity?: TourIssueSeverity;
};

export function useReportTourIssue(tourId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, title, description, stopId, severity }: TourIssueInput) => {
      if (!tourId) throw new Error("Missing tour id");
      const payload: Record<string, unknown> = {
        type,
        title: title.trim(),
        severity: severity ?? "NORMAL"
      };
      const trimmedDescription = description?.trim();
      if (trimmedDescription) payload.description = trimmedDescription;
      if (stopId) payload.stopId = stopId;

      await api.postQueued(`/api/mobile/tours/${tourId}/issues`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}
