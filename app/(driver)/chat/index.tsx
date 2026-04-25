import { useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Pressable } from "@/components/ui";
import { LightTokens as T } from "@/lib/theme";
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function onRefresh() {
    setIsRefreshing(true);
    try {
      await threadsQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  const threads = useMemo(() => {
    const items = [...(threadsQuery.data ?? [])];
    return items.sort((a, b) => {
      const aTs = new Date(a.lastMessage?.createdAt ?? a.updatedAt).getTime();
      const bTs = new Date(b.lastMessage?.createdAt ?? b.updatedAt).getTime();
      return bTs - aTs;
    });
  }, [threadsQuery.data]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { flexGrow: threads.length ? 0 : 1 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={T.accent}
            colors={[T.accent]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Poruke</Text>
              <Pressable style={styles.newBtn} onPress={() => router.push("/chat/new")}>
                <Text style={styles.newBtnText}>+ Novi</Text>
              </Pressable>
            </View>

            {threadsQuery.isLoading ? <Text style={styles.loading}>Ucitavanje razgovora...</Text> : null}
            {threadsQuery.isError ? (
              <View style={[styles.card, styles.errorCard]}>
                <Text style={styles.errorText}>Ucitavanje razgovora nije uspelo.</Text>
                <Pressable style={styles.retryBtn} onPress={() => void threadsQuery.refetch()}>
                  <Text style={styles.retryText}>Pokusaj ponovo</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => {
          const title = threadTitle(item, session?.user.id);
          const preview = item.lastMessage?.body ?? "Nema poruka";
          const timestamp = item.lastMessage?.createdAt ?? item.updatedAt;

          return (
            <Pressable onPress={() => router.push(`/chat/${item.id}` as never)}>
              <View style={[styles.card, styles.itemCard]}>
                <View style={styles.itemRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(title)}</Text>
                  </View>

                  <View style={styles.itemContent}>
                    <View style={styles.itemTop}>
                      <Text numberOfLines={1} style={styles.itemTitle}>{title}</Text>
                      <Text style={styles.time}>{formatDateTime(timestamp)}</Text>
                    </View>
                    <Text numberOfLines={1} style={styles.preview}>{preview}</Text>
                  </View>

                  {item.hasUnread ? <View style={styles.unread} /> : null}
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          threadsQuery.isSuccess ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>Nema razgovora. Napravite novi razgovor.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bgApp
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 18
  },
  headerRow: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    color: T.textPrimary,
    fontSize: 26,
    fontWeight: "800"
  },
  loading: {
    color: T.textSecondary,
    marginBottom: 8
  },
  itemCard: {
    marginBottom: 10
  },
  card: {
    backgroundColor: T.bgSurface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 12
  },
  newBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#7dd3fc",
    backgroundColor: "#ecfeff",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  newBtnText: {
    color: "#0e7490",
    fontWeight: "700",
    fontSize: 12
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d1fae5"
  },
  avatarText: {
    color: "#065f46",
    fontWeight: "700"
  },
  itemContent: {
    marginLeft: 10,
    flex: 1
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  itemTitle: {
    flex: 1,
    color: T.textPrimary,
    fontWeight: "700"
  },
  time: {
    color: T.textSecondary,
    fontSize: 11
  },
  preview: {
    marginTop: 3,
    color: "#475569",
    fontSize: 13
  },
  unread: {
    marginLeft: 8,
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: "#0d7d72"
  },
  emptyText: {
    color: T.textSecondary,
    textAlign: "center"
  },
  errorCard: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2"
  },
  errorText: {
    color: "#b91c1c"
  },
  retryBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  retryText: {
    color: "#b91c1c",
    fontWeight: "700"
  }
});
