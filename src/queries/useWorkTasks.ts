import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type WorkTaskType = "LOAD" | "UNLOAD" | "TRANSFER" | "SERVICE" | "PREP" | "OTHER" | string;
export type WorkTaskStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELED" | string;

// Statusi koje vozač sme da postavi sa mobilne; otkazivanje je samo web/dispečer.
export type WorkTaskStatusInput = "OPEN" | "IN_PROGRESS" | "DONE";

export type WorkTask = {
  id: string;
  type: WorkTaskType;
  status: WorkTaskStatus;
  date: string | null;
  title: string | null;
  note: string | null;
  vehicleId: string | null;
  trailerId: string | null;
  locationId: string | null;
  vehicleReg: string | null;
  trailerReg: string | null;
  locationName: string | null;
  tourId: string | null;
  freightOrderId: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  LOAD: "Utovar",
  UNLOAD: "Istovar",
  TRANSFER: "Pretovar",
  SERVICE: "Servis",
  PREP: "Priprema",
  OTHER: "Ostalo"
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Otvoren",
  IN_PROGRESS: "U toku",
  DONE: "Gotovo",
  CANCELED: "Otkazano"
};

export function workTaskTypeLabel(type?: string | null): string {
  if (!type) return "Ostalo";
  return TYPE_LABELS[type] ?? "Ostalo";
}

export function workTaskStatusLabel(status?: string | null): string {
  if (!status) return "";
  return STATUS_LABELS[status] ?? status;
}

function unwrapItems<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  const raw = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)
    ? (data as { items: unknown[] }).items
    : [];
  return raw.filter((item): item is T => Boolean(item) && typeof item === "object");
}

export type WorkTasksPage = { items: WorkTask[]; nextCursor: string | null };

function unwrapPage(payload: unknown): WorkTasksPage {
  const data = payload && typeof payload === "object" ? (payload as { data?: unknown }).data : null;
  const nextCursor =
    data && typeof data === "object" && typeof (data as { nextCursor?: unknown }).nextCursor === "string"
      ? (data as { nextCursor: string }).nextCursor
      : null;
  return { items: unwrapItems<WorkTask>(payload), nextCursor };
}

// Istorija: view=history vraca DONE + CANCELED, sortirano po date opadajuce,
// sa paginacijom kurzorom (backend, 2026-10-16).
export function useWorkTasksHistory(pageSize = 30) {
  return useInfiniteQuery({
    queryKey: ["work-tasks", "history", pageSize],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const params = new URLSearchParams({ view: "history", limit: String(pageSize) });
      if (pageParam) params.set("cursor", pageParam);
      const result = await api.get<unknown>(`/api/mobile/work-tasks?${params.toString()}`);
      return unwrapPage(result);
    },
    getNextPageParam: (last: WorkTasksPage) => last.nextCursor,
    staleTime: 60_000
  });
}

export function useWorkTasks() {
  return useQuery({
    queryKey: ["work-tasks"],
    queryFn: async () => {
      const result = await api.get<unknown>("/api/mobile/work-tasks?view=active");
      return unwrapItems<WorkTask>(result);
    },
    staleTime: 30_000
  });
}

export function useUpdateWorkTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status: WorkTaskStatusInput; note?: string | null }) => {
      const body: Record<string, unknown> = { status: params.status };
      if (params.note !== undefined) body.note = params.note?.trim() || "";
      return api.patch<{ ok: boolean }>(`/api/mobile/work-tasks/${params.id}`, body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["work-tasks"] });
    }
  });
}
