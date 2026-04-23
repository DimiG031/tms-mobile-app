import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppDocument } from "@/lib/types";
import { normalizePagedPayload } from "@/lib/api-normalizers";

export function useTourDocuments(tourId?: string) {
  return useQuery({
    queryKey: ["tour-documents", tourId],
    queryFn: async () => {
      if (!tourId) return [];
      const result = await api.get<unknown>(`/api/documents?relatedType=tour&relatedId=${tourId}&limit=50`);
      return normalizePagedPayload<AppDocument>(result).items;
    },
    enabled: Boolean(tourId)
  });
}

export function useCreateTourDocument(tourId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize?: number | null;
      checksum?: string | null;
    }) => {
      if (!tourId) throw new Error("Missing tour id");
      await api.postQueued("/api/documents", {
        fileName: params.fileName,
        fileUrl: params.fileUrl,
        fileType: params.fileType,
        fileSize: params.fileSize ?? null,
        relatedType: "tour",
        relatedId: tourId,
        tourId,
        checksum: params.checksum ?? null
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tour-documents", tourId] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}
