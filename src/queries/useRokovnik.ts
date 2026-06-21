import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type RokovnikCategory = "GENERAL" | "PARKING" | "LEGAL" | "PAYMENT" | "FUEL" | "MAINTENANCE" | "OTHER";
export type RokovnikPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type RokovnikItem = {
  id: string;
  date: string | null;
  title: string;
  note: string | null;
  done: boolean;
  status: string | null;
  category: RokovnikCategory | string | null;
  priority: RokovnikPriority | string | null;
  visibility: string | null;
  relatedName: string | null;
  reminderAt: string | null;
};

export type RokovnikInput = {
  title: string;
  note?: string | null;
  date?: string | null; // YYYY-MM-DD
  done?: boolean;
  reminderAt?: string | null;
  category?: RokovnikCategory;
  priority?: RokovnikPriority;
};

function normalizeList(payload: unknown): RokovnikItem[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { data?: unknown };
  const raw = Array.isArray(root.data)
    ? root.data
    : root.data && typeof root.data === "object" && Array.isArray((root.data as { items?: unknown }).items)
    ? (root.data as { items: unknown[] }).items
    : [];
  return raw.filter((item): item is RokovnikItem => Boolean(item) && typeof item === "object");
}

export function useRokovnik(status?: string | null) {
  const normalizedStatus = status?.trim() || null;
  return useQuery({
    queryKey: ["rokovnik", normalizedStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (normalizedStatus) params.set("status", normalizedStatus);
      const result = await api.get<unknown>(`/api/mobile/rokovnik?${params.toString()}`);
      return normalizeList(result);
    },
    staleTime: 60_000
  });
}

function buildPayload(input: Partial<RokovnikInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.note !== undefined) payload.note = input.note?.trim() || null;
  if (input.date !== undefined) payload.date = input.date || null;
  if (input.done !== undefined) payload.done = input.done;
  if (input.reminderAt !== undefined) payload.reminderAt = input.reminderAt || null;
  if (input.category !== undefined) payload.category = input.category;
  if (input.priority !== undefined) payload.priority = input.priority;
  return payload;
}

export function useCreateRokovnik() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RokovnikInput) => {
      await api.postQueued("/api/mobile/rokovnik", buildPayload(input));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rokovnik"] });
    }
  });
}

export function useUpdateRokovnik() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; data: Partial<RokovnikInput> }) => {
      await api.patchQueued(`/api/mobile/rokovnik/${params.id}`, buildPayload(params.data));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rokovnik"] });
    }
  });
}

export function useToggleRokovnik() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; done: boolean }) => {
      await api.patchQueued(`/api/mobile/rokovnik/${params.id}`, { done: params.done });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rokovnik"] });
    }
  });
}

export function useDeleteRokovnik() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.deleteQueued(`/api/mobile/rokovnik/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rokovnik"] });
    }
  });
}
