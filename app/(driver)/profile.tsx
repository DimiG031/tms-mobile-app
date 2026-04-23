import { Alert, RefreshControl, ScrollView } from "react-native";
import { Pressable, Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useDriverProfile } from "@/queries/useDriverProfile";
import { formatDate } from "@/lib/formatters";

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { data, isLoading, isError, isRefetching, refetch } = useDriverProfile(session?.user.driverId);

  const onSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Odjava nije uspela";
      Alert.alert("Odjava", message);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      <Text className="text-xl font-bold text-slate-900">Profil vozaca</Text>

      <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <Text className="text-xs uppercase text-slate-500">Ime i prezime</Text>
        <Text className="mt-1 text-base font-semibold text-slate-900">{data?.name ?? session?.user.name ?? "-"}</Text>

        <Text className="mt-3 text-xs uppercase text-slate-500">Email</Text>
        <Text className="mt-1 text-slate-700">{session?.user.email ?? "-"}</Text>

        <Text className="mt-3 text-xs uppercase text-slate-500">Telefon</Text>
        <Text className="mt-1 text-slate-700">{data?.phone ?? "-"}</Text>

        <Text className="mt-3 text-xs uppercase text-slate-500">Istek dozvole</Text>
        <Text className="mt-1 text-slate-700">{formatDate(data?.licenseExpiry)}</Text>

        <Text className="mt-3 text-xs uppercase text-slate-500">Uloga</Text>
        <Text className="mt-1 text-slate-700">{session?.user.role ?? "-"}</Text>
      </View>

      {isLoading ? <Text className="mt-4 text-slate-500">Ucitavanje profila...</Text> : null}
      {isError ? (
        <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <Text className="text-red-700">Ucitavanje profila nije uspelo.</Text>
          <Pressable onPress={() => void refetch()} className="mt-2 self-start rounded-lg border border-red-300 px-3 py-2">
            <Text className="text-red-700">Pokusaj ponovo</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable onPress={onSignOut} className="mt-6 rounded-xl border border-red-300 px-4 py-3">
        <Text className="text-center font-semibold text-red-700">Odjavi se</Text>
      </Pressable>
    </ScrollView>
  );
}
