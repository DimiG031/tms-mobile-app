import { Ionicons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Pressable, TextInput } from "@/components/ui";
import { useTheme, type AppTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { formatDateTime } from "@/lib/formatters";
import { useChatMessages, useMarkThreadRead, useSendChatMessage } from "@/queries/useChat";
import type { ChatMessage } from "@/lib/types";

function senderName(message: ChatMessage): string {
  return message.sender?.name ?? "Korisnik";
}

function dedupeAndSortMessages(items: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return Array.from(map.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export default function ChatThreadScreen() {
  const params = useLocalSearchParams<{ id: string; from?: string }>();
  const threadId = params.id;
  const fromNotifications = params.from === "notifications";
  const fromChatPush = params.from === "chat-push";
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const netInfo = useNetInfo();
  const { session } = useAuth();

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const isAtBottomRef = useRef(true);
  const latestMessageIdRef = useRef<string | null>(null);
  const didInitialScrollRef = useRef(false);
  const shouldScrollAfterSendRef = useRef(false);
  const markReadRef = useRef<ReturnType<typeof useMarkThreadRead> | null>(null);

  const [body, setBody] = useState("");

  const messagesQuery = useChatMessages(threadId);
  const markRead = useMarkThreadRead(threadId);
  const sendMessage = useSendChatMessage(threadId, session?.user);

  useFocusEffect(
    useCallback(() => {
      if (!threadId) return;
      void messagesQuery.refetch();
    }, [messagesQuery.refetch, threadId])
  );

  useEffect(() => {
    markReadRef.current = markRead;
  }, [markRead]);

  const messages = useMemo(() => {
    const flat = messagesQuery.data?.pages.flatMap((page) => page.items) ?? [];
    return dedupeAndSortMessages(flat);
  }, [messagesQuery.data]);

  const latestMessageId = messages.length ? messages[messages.length - 1].id : null;
  const hasNextCursor = Boolean(messagesQuery.data?.pages[messagesQuery.data.pages.length - 1]?.nextCursor);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }

  useEffect(() => {
    didInitialScrollRef.current = false;
    latestMessageIdRef.current = null;
    shouldScrollAfterSendRef.current = false;
  }, [threadId]);

  useEffect(() => {
    if (!latestMessageId) return;

    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      latestMessageIdRef.current = latestMessageId;
      scrollToBottom();
      void markReadRef.current?.mutateAsync().catch(() => {});
      return;
    }

    if (latestMessageIdRef.current !== latestMessageId) {
      const shouldScroll = isAtBottomRef.current || shouldScrollAfterSendRef.current;
      latestMessageIdRef.current = latestMessageId;
      if (shouldScroll) scrollToBottom();
      shouldScrollAfterSendRef.current = false;
      void markReadRef.current?.mutateAsync().catch(() => {});
    }
  }, [latestMessageId]);

  function onSend() {
    const trimmed = body.trim();
    if (!trimmed) return;

    if (!netInfo.isConnected) {
      Alert.alert("Poruke", "Nema veze.");
      return;
    }

    shouldScrollAfterSendRef.current = true;
    setBody("");
    sendMessage.mutate(trimmed, {
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Slanje poruke nije uspelo.";
        Alert.alert("Poruke", message);
      }
    });
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const threshold = 48;
    isAtBottomRef.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - threshold;
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerLeft: fromNotifications || fromChatPush
            ? () => (
                <Pressable
                  onPress={() => router.replace(fromChatPush ? "/(driver)/chat" : "/(driver)/notifications")}
                  style={{ paddingRight: 8 }}
                >
                  <Ionicons name="chevron-back" size={26} color="#0d7d72" />
                </Pressable>
              )
            : undefined
        }}
      />
      <View style={styles.listWrap}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          onScroll={onScroll}
          scrollEventThrottle={32}
          contentContainerStyle={[styles.listContent, { flexGrow: messages.length ? 0 : 1 }]}
          ListHeaderComponent={
            hasNextCursor ? (
              <Pressable style={styles.moreBtn} onPress={() => void messagesQuery.fetchNextPage()} disabled={messagesQuery.isFetchingNextPage}>
                <Text style={styles.moreText}>{messagesQuery.isFetchingNextPage ? "Učitavanje..." : "Učitaj starije"}</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => {
            const mine = item.senderId === session?.user.id;
            return (
              <View style={[styles.messageLine, mine ? styles.right : styles.left]}>
                {!mine ? <Text style={styles.sender}>{senderName(item)}</Text> : null}
                <View style={[styles.bubble, mine ? styles.mineBubble : styles.otherBubble]}>
                  <Text style={mine ? styles.mineText : styles.otherText}>{item.body}</Text>
                </View>
                <Text style={styles.metaTime}>{formatDateTime(item.createdAt)}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            !messagesQuery.isLoading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.empty}>Nema poruka. Pošaljite prvu poruku.</Text>
              </View>
            ) : null
          }
        />
      </View>

      <View style={styles.inputBar}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={netInfo.isConnected ? "Unesite poruku..." : "Offline - slanje nije dostupno"}
          placeholderTextColor={theme.text.muted}
          editable={Boolean(netInfo.isConnected)}
          multiline
          className="max-h-28 min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <Pressable
          style={[styles.sendBtn, (!netInfo.isConnected || !body.trim() || sendMessage.isPending) ? styles.disabled : null]}
          onPress={onSend}
          disabled={!netInfo.isConnected || !body.trim() || sendMessage.isPending}
        >
          <Text style={styles.sendText}>{sendMessage.isPending ? "..." : "Pošalji"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.surface.app
  },
  listWrap: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12
  },
  listContent: {
    paddingBottom: 14
  },
  moreBtn: {
    alignSelf: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.surface.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  moreText: {
    color: theme.text.secondary,
    fontSize: 12,
    fontWeight: "700"
  },
  messageLine: {
    marginBottom: 10,
    maxWidth: "86%"
  },
  left: {
    alignSelf: "flex-start"
  },
  right: {
    alignSelf: "flex-end"
  },
  sender: {
    marginBottom: 4,
    marginLeft: 2,
    color: theme.text.secondary,
    fontSize: 11,
    fontWeight: "700"
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1
  },
  mineBubble: {
    backgroundColor: "#0d7d72",
    borderColor: "#0d7d72"
  },
  otherBubble: {
    backgroundColor: theme.surface.subtle,
    borderColor: theme.surface.border
  },
  mineText: {
    color: "#fff"
  },
  otherText: {
    color: theme.text.primary
  },
  metaTime: {
    marginTop: 4,
    color: theme.text.secondary,
    fontSize: 11
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.surface.border,
    backgroundColor: theme.surface.card,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14
  },
  sendBtn: {
    borderRadius: 10,
    backgroundColor: "#0d7d72",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  sendText: {
    color: "#fff",
    fontWeight: "700"
  },
  disabled: {
    opacity: 0.6
  },
  empty: {
    textAlign: "center",
    color: theme.text.secondary
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: theme.surface.border,
    borderRadius: 16,
    backgroundColor: theme.surface.card,
    padding: 12
  }
  });
}
