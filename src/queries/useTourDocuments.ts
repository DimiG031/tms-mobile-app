import { useEffect, useState } from "react";
import { getOfflineWriteQueue, subscribeOfflineQueueCount } from "@/lib/offline-queue";
import { getSessionRevision } from "@/lib/secure-store";
import { useAuth } from "@/providers/AuthProvider";
import { isTraceId } from "@/lib/diagnostics";
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
      return await api.postQueued("/api/documents", {
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
    onSuccess: async (result) => {
      if (result.queued) return;
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["tour-documents", tourId] }),
        queryClient.invalidateQueries({ queryKey: ["documents"] }),
        queryClient.invalidateQueries({ queryKey: ["tour-details", tourId] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
      ]);
    }
  });
}


export type PendingTourDocument = { id: string; fileName: string; blocked: boolean; message: string; canRetry: boolean };
export function usePendingTourDocuments(tourId?: string) {
  const { sessionRevision } = useAuth();
  const [items, setItems] = useState<PendingTourDocument[]>([]);
  useEffect(() => {
    let alive = true, read = 0;
    const revision = getSessionRevision();
    const refresh = () => {
      const sequence = ++read;
      void getOfflineWriteQueue().then(queue => {
        if (!alive || sequence !== read || getSessionRevision() !== revision) return;
        setItems(queue.filter(item => {
          const body = item.body as { tourId?: string } | undefined;
          return Boolean(tourId) && item.method === "POST" && item.path === "/api/documents" && body?.tourId === tourId;
        }).map(item => ({
          id: item.id, fileName: typeof (item.body as { fileName?: unknown }).fileName === "string"
            ? (item.body as { fileName: string }).fileName : "Dokument",
          blocked: Boolean(item.blocked), canRetry: Boolean(item.blocked && item.failureStatus !== 409 && isTraceId(item.operationKey)),
          message: item.blocked ? item.failureMessage || "Zahtev nije prihvaćen."
            : "Potvrda servera još nije stigla. Automatski ćemo pokušati ponovo."
        })));
      }).catch(() => { /* Preserve the last known list if device storage is unavailable. */ });
    };
    refresh();
    const unsubscribe = subscribeOfflineQueueCount(refresh);
    return () => { alive = false; unsubscribe(); };
  }, [tourId, sessionRevision]);
  return items;
}
