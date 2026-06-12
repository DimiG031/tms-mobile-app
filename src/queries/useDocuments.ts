import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppDocument } from "@/lib/types";
import { normalizePagedPayload } from "@/lib/api-normalizers";

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const result = await api.get<unknown>("/api/documents?limit=100");
      return normalizePagedPayload<AppDocument>(result).items;
    },
    staleTime: 5 * 60 * 1000
  });
}
