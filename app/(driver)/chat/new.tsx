import { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Pressable, TextInput } from "@/components/ui";
import { LightTokens as T } from "@/lib/theme";
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
    return filtered.filter((item) => item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q));
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
    <View style={styles.screen}>
      <TextInput value={search} onChangeText={setSearch} placeholder="Pretrazi korisnike..." className="rounded-xl border border-slate-200 bg-white px-4 py-3" />

      {usersQuery.isLoading ? <Text style={styles.loading}>Ucitavanje korisnika...</Text> : null}

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { flexGrow: users.length ? 0 : 1 }]}
        renderItem={({ item }) => (
          <Pressable onPress={() => onCreateThread(item.id)} disabled={createThread.isPending}>
            <View style={[styles.card, styles.itemCard]}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(item.name)}</Text>
                </View>
                <View style={styles.main}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.mail}>{item.email}</Text>
                </View>
                <Text style={styles.role}>{item.role}</Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={!usersQuery.isLoading ? <View style={styles.card}><Text style={styles.empty}>Nema korisnika za razgovor.</Text></View> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bgApp,
    padding: 16
  },
  loading: {
    marginTop: 8,
    color: T.textSecondary
  },
  content: {
    paddingTop: 12,
    paddingBottom: 20
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
  row: {
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
  main: {
    marginLeft: 10,
    flex: 1
  },
  name: {
    color: T.textPrimary,
    fontWeight: "700"
  },
  mail: {
    color: "#475569",
    fontSize: 13,
    marginTop: 2
  },
  role: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  empty: {
    textAlign: "center",
    color: T.textSecondary
  }
});
