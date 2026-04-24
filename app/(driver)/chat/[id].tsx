import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import { Pressable, TextInput } from "@/components/ui";
import { LightTokens as T } from "@/lib/theme";
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
  const params = useLocalSearchParams<{ id: string }>();
  const threadId = params.id;
  const netInfo = useNetInfo();
  const { session } = useAuth();

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const isAtBottomRef = useRef(true);
  const latestMessageIdRef = useRef<string | null>(null);
  const didInitialScrollRef = useRef(false);
  const shouldScrollAfterSendRef = useRef(false);

  const [body, setBody] = useState("");

  const messagesQuery = useChatMessages(threadId);
  const markRead = useMarkThreadRead(threadId);
  const sendMessage = useSendChatMessage(threadId, session?.user);

  const messages = useMemo(() => {
    const flat = messagesQuery.data?.pages.flatMap((page) => page.items) ?? [];
    return dedupeAndSortMessages(flat);
  }, [messagesQuery.data]);

  const latestMessageId = messages.length ? messages[messages.length - 1].id : null;
  const hasNextCursor = Boolean(messagesQuery.data?.pages[messagesQuery.data.pages.length - 1]?.nextCursor);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    if (!threadId) return;
    markRead.mutate();
  }, [threadId, markRead]);

  useEffect(() => {
    if (!latestMessageId) return;

    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      latestMessageIdRef.current = latestMessageId;
      scrollToBottom();
      void markRead.mutateAsync().catch(() => {});
      return;
    }

    if (latestMessageIdRef.current !== latestMessageId) {
      const shouldScroll = isAtBottomRef.current || shouldScrollAfterSendRef.current;
      latestMessageIdRef.current = latestMessageId;
      if (shouldScroll) scrollToBottom();
      shouldScrollAfterSendRef.current = false;
      void markRead.mutateAsync().catch(() => {});
    }
  }, [latestMessageId, markRead]);

  const onSend = () => {
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
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const threshold = 48;
    isAtBottomRef.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - threshold;
  };

  return (
    <View style={styles.screen}>
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
                <Text style={styles.moreText}>{messagesQuery.isFetchingNextPage ? "Ucitavanje..." : "Ucitaj starije"}</Text>
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
          ListEmptyComponent={!messagesQuery.isLoading ? <View style={styles.emptyCard}><Text style={styles.empty}>Nema poruka. Posaljite prvu poruku.</Text></View> : null}
        />
      </View>

      <View style={styles.inputBar}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={netInfo.isConnected ? "Unesite poruku..." : "Offline - slanje nije dostupno"}
          editable={Boolean(netInfo.isConnected)}
          multiline
          className="max-h-28 min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
        />
        <Pressable style={[styles.sendBtn, (!netInfo.isConnected || !body.trim() || sendMessage.isPending) ? styles.disabled : null]} onPress={onSend} disabled={!netInfo.isConnected || !body.trim() || sendMessage.isPending}>
          <Text style={styles.sendText}>{sendMessage.isPending ? "..." : "Posalji"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bgApp
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
    borderColor: "#94a3b8",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  moreText: {
    color: "#334155",
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
    color: T.textSecondary,
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
    backgroundColor: "#e2e8f0",
    borderColor: "#cbd5e1"
  },
  mineText: {
    color: "#fff"
  },
  otherText: {
    color: T.textPrimary
  },
  metaTime: {
    marginTop: 4,
    color: T.textSecondary,
    fontSize: 11
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
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
    color: T.textSecondary
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    backgroundColor: T.bgSurface,
    padding: 12
  }
});
