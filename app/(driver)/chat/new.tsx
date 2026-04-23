import { useMemo, useState } from "react";
import { Alert, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useChatUsers, useCreateChatThread } from "@/queries/useChat";

function initials(name: string): string {
  const tokens = name.trim().split(/\s+/).slice(0, 2);
  if (!tokens.length) return "?";
  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function NewChatScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const usersQuery = useChatUsers();
  const createThread = useCreateChatThread();

  const users = useMemo(() => {
    const items = usersQuery.data ?? [];
    const filtered = items.filter((item) => item.id !== session?.user.id);
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((item) => {
      return item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q);
    });
  }, [search, session?.user.id, usersQuery.data]);

  const onCreateThread = (userId: string) => {
    createThread.mutate(
      { participantIds: [userId] },
      {
        onSuccess: (thread) => {
          router.replace(`/chat/${thread.id}` as never);
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Kreiranje razgovora nije uspelo.";
          Alert.alert("Poruke", message);
        }
      }
    );
  };

  return (
    <View className="flex-1 bg-white px-4 py-4">
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Pretrazi korisnike..."
        className="rounded-xl border border-slate-200 bg-white px-4 py-3"
      />

      {usersQuery.isLoading ? <Text className="mt-3 text-slate-500">Ucitavanje korisnika...</Text> : null}
      {usersQuery.isError ? (
        <View className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <Text className="text-red-700">Ucitavanje korisnika nije uspelo.</Text>
          <Pressable onPress={() => void usersQuery.refetch()} className="mt-2 self-start rounded-lg border border-red-300 px-3 py-2">
            <Text className="text-red-700">Pokusaj ponovo</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, flexGrow: users.length ? 0 : 1 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onCreateThread(item.id)}
            disabled={createThread.isPending}
            className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 disabled:opacity-60"
          >
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-100">
                <Text className="font-semibold text-brand-700">{initials(item.name)}</Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-slate-900">{item.name}</Text>
                <Text className="text-sm text-slate-600">{item.email}</Text>
              </View>
              <Text className="text-xs uppercase text-slate-500">{item.role}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !usersQuery.isLoading ? (
            <View className="flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6">
              <Text className="text-center text-slate-600">Nema korisnika za razgovor.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

