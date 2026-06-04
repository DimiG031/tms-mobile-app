import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ExpenseItem, ExpenseSheet, ExpenseSheetStatus } from "@/lib/types";

type ExpenseItemPayload = {
  country: string;
  category: string;
  date: string;
  cashAmount: number | null;
  cardAmount: number | null;
  currency: string;
  note: string | null;
  receiptUrl: string | null;
};

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeExpenseItem(item: ExpenseItem): ExpenseItem {
  return {
    ...item,
    cashAmount: toNumberOrNull(item.cashAmount),
    cardAmount: toNumberOrNull(item.cardAmount)
  };
}

function normalizeExpenseSheetNumbers(sheet: ExpenseSheet): ExpenseSheet {
  return {
    ...sheet,
    advance: toNumberOrNull(sheet.advance),
    items: (sheet.items ?? []).map(normalizeExpenseItem)
  };
}

function normalizeExpenseSheet(payload: unknown): ExpenseSheet | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as { data?: unknown };
  if (!root.data || typeof root.data !== "object") return null;
  return normalizeExpenseSheetNumbers(root.data as ExpenseSheet);
}

function normalizeExpenseItems(payload: unknown): ExpenseItem[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { data?: unknown };
  if (!root.data) return [];

  if (Array.isArray(root.data)) {
    return root.data.map(normalizeExpenseItem) as ExpenseItem[];
  }

  if (typeof root.data === "object") {
    const dataObj = root.data as { items?: unknown };
    if (Array.isArray(dataObj.items)) {
      return dataObj.items.map(normalizeExpenseItem) as ExpenseItem[];
    }
  }

  return [];
}

export function useExpenseSheet(tourId?: string) {
  return useQuery({
    queryKey: ["expense-sheet", tourId],
    queryFn: async () => {
      if (!tourId) return null;
      const result = await api.get<unknown>(`/api/tours/${tourId}/expense-sheet`);
      const sheet = normalizeExpenseSheet(result);
      if (!sheet?.id) return sheet;

      const itemsResult = await api.get<unknown>(`/api/tours/${tourId}/expense-sheet/${sheet.id}/items`);
      return {
        ...sheet,
        items: normalizeExpenseItems(itemsResult)
      } as ExpenseSheet;
    },
    enabled: Boolean(tourId),
    staleTime: 60_000
  });
}

export function useCreateExpenseSheet(tourId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { advance?: number | null; advanceCurrency?: string; notes?: string | null }) => {
      if (!tourId) throw new Error("Missing tour id");
      await api.postQueued(`/api/tours/${tourId}/expense-sheet`, {
        advance: params.advance ?? null,
        advanceCurrency: params.advanceCurrency ?? "EUR",
        notes: params.notes ?? null
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expense-sheet", tourId] });
      await queryClient.invalidateQueries({ queryKey: ["tour-details", tourId] });
    }
  });
}

export function useUpdateExpenseSheet(sheetId?: string, tourId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { status?: ExpenseSheetStatus; advance?: number | null; advanceCurrency?: string; notes?: string | null }) => {
      if (!sheetId || !tourId) throw new Error("Missing expense sheet data");
      await api.patchQueued(`/api/tours/${tourId}/expense-sheet/${sheetId}`, params);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expense-sheet", tourId] });
      await queryClient.invalidateQueries({ queryKey: ["tour-details", tourId] });
      await queryClient.invalidateQueries({ queryKey: ["tours"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}

export function useCreateExpenseItem(sheetId?: string, tourId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: ExpenseItemPayload) => {
      if (!sheetId || !tourId) throw new Error("Missing expense sheet data");
      await api.postQueued(`/api/tours/${tourId}/expense-sheet/${sheetId}/items`, item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expense-sheet", tourId] });
    }
  });
}

export function useUpdateExpenseItem(sheetId?: string, tourId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { itemId: string; data: Partial<ExpenseItemPayload> }) => {
      if (!sheetId || !tourId || !params.itemId) throw new Error("Missing expense item data");
      await api.patchQueued(`/api/tours/${tourId}/expense-sheet/${sheetId}/items/${params.itemId}`, params.data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expense-sheet", tourId] });
    }
  });
}

export function useDeleteExpenseItem(sheetId?: string, tourId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      if (!sheetId || !tourId) throw new Error("Missing expense sheet data");
      await api.deleteQueued(`/api/tours/${tourId}/expense-sheet/${sheetId}/items/${itemId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expense-sheet", tourId] });
    }
  });
}
