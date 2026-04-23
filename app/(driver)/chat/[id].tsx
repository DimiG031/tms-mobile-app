import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import { Pressable, Text, TextInput, View } from "@/components/ui";
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
  return Array.from(map.values()).sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

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
      if (shouldScroll) {
        scrollToBottom();
      }
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
    isAtBottomRef.current =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - threshold;
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 px-4 pt-3">
        {messagesQuery.isLoading ? <Text className="mb-3 text-slate-500">Ucitavanje poruka...</Text> : null}
        {messagesQuery.isError ? (
          <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-red-700">Ucitavanje poruka nije uspelo.</Text>
            <Pressable onPress={() => void messagesQuery.refetch()} className="mt-2 self-start rounded-lg border border-red-300 px-3 py-2">
              <Text className="text-red-700">Pokusaj ponovo</Text>
            </Pressable>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          onScroll={onScroll}
          scrollEventThrottle={32}
          contentContainerStyle={{ paddingBottom: 16, flexGrow: messages.length ? 0 : 1 }}
          ListHeaderComponent={
            hasNextCursor ? (
              <Pressable
                onPress={() => void messagesQuery.fetchNextPage()}
                disabled={messagesQuery.isFetchingNextPage}
                className="mb-3 self-center rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-60"
              >
                <Text className="text-sm text-slate-700">
                  {messagesQuery.isFetchingNextPage ? "Ucitavanje..." : "Ucitaj starije"}
                </Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => {
            const mine = item.senderId === session?.user.id;
            return (
              <View className={`mb-2 ${mine ? "items-end" : "items-start"}`}>
                {!mine ? <Text className="mb-1 text-xs text-slate-500">{senderName(item)}</Text> : null}
                <View
                  className={`max-w-[82%] rounded-2xl px-3 py-2 ${mine ? "bg-blue-500" : "bg-slate-200"}`}
                >
                  <Text className={mine ? "text-white" : "text-slate-900"}>{item.body}</Text>
                </View>
                <Text className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt)}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            !messagesQuery.isLoading ? (
              <View className="flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6">
                <Text className="text-center text-slate-600">Nema poruka. Posaljite prvu poruku.</Text>
              </View>
            ) : null
          }
        />
      </View>

      <View className="border-t border-slate-200 bg-white px-4 pb-4 pt-3">
        <View className="flex-row items-end gap-2">
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={netInfo.isConnected ? "Unesite poruku..." : "Offline - slanje nije dostupno"}
            editable={Boolean(netInfo.isConnected)}
            multiline
            className="max-h-28 min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
          <Pressable
            onPress={onSend}
            disabled={!netInfo.isConnected || !body.trim() || sendMessage.isPending}
            className="rounded-xl bg-brand-600 px-4 py-3 disabled:opacity-60"
          >
            <Text className="font-semibold text-white">{sendMessage.isPending ? "..." : "Posalji"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

