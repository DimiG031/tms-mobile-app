import { useMemo } from "react";
import { FlatList } from "react-native";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { formatDateTime } from "@/lib/formatters";
import { useChatThreads } from "@/queries/useChat";
import type { ChatThread } from "@/lib/types";

function initials(name: string): string {
  const tokens = name.trim().split(/\s+/).slice(0, 2);
  if (!tokens.length) return "?";
  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("") || "?";
}

function threadTitle(thread: ChatThread, currentUserId?: string) {
  if (thread.title?.trim()) return thread.title;
  const other = thread.participants.find((participant) => participant.userId !== currentUserId);
  return other?.name ?? "Razgovor";
}

export default function ChatListScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const threadsQuery = useChatThreads();

  const threads = useMemo(() => {
    const items = [...(threadsQuery.data ?? [])];
    return items.sort((a, b) => {
      const aTs = new Date(a.lastMessage?.createdAt ?? a.updatedAt).getTime();
      const bTs = new Date(b.lastMessage?.createdAt ?? b.updatedAt).getTime();
      return bTs - aTs;
    });
  }, [threadsQuery.data]);

  return (
    <View className="flex-1 bg-white px-4 py-4">
      <Text className="mb-3 text-xl font-bold text-slate-900">Poruke</Text>

      {threadsQuery.isLoading ? <Text className="text-slate-500">Ucitavanje razgovora...</Text> : null}
      {threadsQuery.isError ? (
        <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <Text className="text-red-700">Ucitavanje razgovora nije uspelo.</Text>
          <Pressable onPress={() => void threadsQuery.refetch()} className="mt-2 self-start rounded-lg border border-red-300 px-3 py-2">
            <Text className="text-red-700">Pokusaj ponovo</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: threads.length ? 0 : 1 }}
        renderItem={({ item }) => {
          const title = threadTitle(item, session?.user.id);
          const preview = item.lastMessage?.body ?? "Nema poruka";
          const timestamp = item.lastMessage?.createdAt ?? item.updatedAt;
          return (
            <Pressable
              onPress={() => router.push(`/chat/${item.id}` as never)}
              className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-100">
                  <Text className="font-semibold text-brand-700">{initials(title)}</Text>
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-semibold text-slate-900">{title}</Text>
                    <Text className="text-xs text-slate-500">{formatDateTime(timestamp)}</Text>
                  </View>
                  <Text className="mt-1 text-sm text-slate-600" numberOfLines={1}>
                    {preview}
                  </Text>
                </View>
                {item.hasUnread ? <View className="ml-2 h-2.5 w-2.5 rounded-full bg-blue-500" /> : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !threadsQuery.isLoading ? (
            <View className="flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6">
              <Text className="text-center text-slate-600">Nema razgovora. Napravite novi razgovor.</Text>
            </View>
          ) : null
        }
      />

      <Pressable
        onPress={() => router.push("/chat/new")}
        className="absolute bottom-6 right-6 rounded-full bg-brand-600 px-5 py-4 shadow"
      >
        <Text className="text-base font-semibold text-white">+ Novi</Text>
      </Pressable>
    </View>
  );
}

