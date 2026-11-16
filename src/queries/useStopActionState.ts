import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { getSessionRevision, assertSessionRevision } from "@/lib/secure-store";
import { getStopActionSnapshot, subscribeOfflineQueueCount } from "@/lib/offline-queue";
export function useStopActionSnapshot() {
  const client = useQueryClient(); const { sessionRevision } = useAuth();
  useEffect(() => subscribeOfflineQueueCount(() => { void client.invalidateQueries({ queryKey: ["stop-action-state"] }); }), [client]);
  return useQuery({ queryKey: ["stop-action-state", sessionRevision], staleTime: 0,
    queryFn: async () => { const revision = getSessionRevision(); const snapshot = await getStopActionSnapshot(); assertSessionRevision(revision); return snapshot; } });
}
