import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ChatMessage, ChatThread, ChatUser } from "@/lib/types";

type ChatMessagesPage = {
  items: ChatMessage[];
  nextCursor: string | null;
  limit: number;
};

function normalizeThreadList(payload: unknown): ChatThread[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { data?: unknown };
  if (!Array.isArray(root.data)) return [];
  return root.data as ChatThread[];
}

function normalizeUsers(payload: unknown): ChatUser[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { data?: unknown };
  if (!Array.isArray(root.data)) return [];
  return root.data as ChatUser[];
}

function normalizeMessagesPage(payload: unknown): ChatMessagesPage {
  if (!payload || typeof payload !== "object") return { items: [], nextCursor: null, limit: 40 };
  const root = payload as { data?: unknown };
  if (!root.data || typeof root.data !== "object") return { items: [], nextCursor: null, limit: 40 };

  const data = root.data as { items?: unknown; nextCursor?: unknown; limit?: unknown };
  return {
    items: Array.isArray(data.items) ? (data.items as ChatMessage[]) : [],
    nextCursor: typeof data.nextCursor === "string" ? data.nextCursor : null,
    limit: typeof data.limit === "number" ? data.limit : 40
  };
}

function optimisticId() {
  return `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useChatThreads() {
  return useQuery({
    queryKey: ["chat-threads"],
    queryFn: async () => {
      const result = await api.get<unknown>("/api/chat/threads");
      return normalizeThreadList(result);
    },
    staleTime: 10_000,
    refetchInterval: 5_000
  });
}

export function useChatUsers() {
  return useQuery({
    queryKey: ["chat-users"],
    queryFn: async () => {
      const result = await api.get<unknown>("/api/chat/users");
      return normalizeUsers(result);
    },
    staleTime: 60_000
  });
}

export function useCreateChatThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { participantIds: string[]; title?: string | null }) => {
      const result = await api.post<{ ok: true; data: ChatThread }>("/api/chat/threads", {
        participantIds: params.participantIds,
        title: params.title ?? null
      });
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    }
  });
}

export function useChatMessages(threadId?: string) {
  return useInfiniteQuery({
    queryKey: ["chat-messages", threadId],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      if (!threadId) return { items: [], nextCursor: null, limit: 40 } as ChatMessagesPage;
      const cursor = pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : "";
      const result = await api.get<unknown>(`/api/chat/threads/${threadId}/messages?limit=40${cursor}`);
      return normalizeMessagesPage(result);
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor || null,
    enabled: Boolean(threadId),
    staleTime: 5_000,
    refetchInterval: 3_000
  });
}

export function useSendChatMessage(threadId?: string, currentUser?: { id: string; name: string; email: string; role: string }) {
  const queryClient = useQueryClient();
  const key = ["chat-messages", threadId];

  return useMutation({
    mutationFn: async (body: string) => {
      if (!threadId) throw new Error("Missing thread id");
      const result = await api.post<{ ok: true; data: ChatMessage }>(`/api/chat/threads/${threadId}/messages`, { body });
      return result.data;
    },
    onMutate: async (body) => {
      if (!threadId || !currentUser) return { previous: undefined as InfiniteData<ChatMessagesPage> | undefined };

      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<InfiniteData<ChatMessagesPage>>(key);

      const optimistic: ChatMessage = {
        id: optimisticId(),
        senderId: currentUser.id,
        body,
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          avatarUrl: null,
          role: currentUser.role
        }
      };

      queryClient.setQueryData<InfiniteData<ChatMessagesPage>>(key, (old) => {
        if (!old) {
          return {
            pageParams: [null],
            pages: [{ items: [optimistic], nextCursor: null, limit: 40 }]
          };
        }

        return {
          ...old,
          pages: old.pages.map((page, idx) => {
            if (idx !== 0) return page;
            return {
              ...page,
              items: [...page.items, optimistic]
            };
          })
        };
      });

      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      await queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    }
  });
}

export function useMarkThreadRead(threadId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!threadId) return;
      await api.patch(`/api/chat/threads/${threadId}/read`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    }
  });
}

