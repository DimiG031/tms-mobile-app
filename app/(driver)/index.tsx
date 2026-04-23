import { Alert, RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useDashboardData } from "@/queries/useDashboardData";
import { translateTourStatus } from "@/lib/formatters";

export default function DriverHomeScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { data, isLoading, isError, isRefetching, refetch } = useDashboardData(session?.user.driverId);
  const activeTour = data?.activeTour ?? null;
  const upcomingCount = data?.upcomingTours.length ?? 0;
  const unreadCount = data?.unreadNotificationsCount ?? 0;

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
      <Text className="text-2xl font-bold text-slate-900">Dobrodosli, {session?.user.name}</Text>
      <Text className="mt-1 text-slate-500">Kontrolna tabla vozaca</Text>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <Pressable onPress={() => router.push("/tours")} className="rounded-lg border border-slate-300 px-3 py-2">
          <Text className="text-slate-700">Sve ture</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/chat")} className="rounded-lg border border-slate-300 px-3 py-2">
          <Text className="text-slate-700">Poruke</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/notifications")} className="rounded-lg border border-slate-300 px-3 py-2">
          <Text className="text-slate-700">Obavestenja</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/profile")} className="rounded-lg border border-slate-300 px-3 py-2">
          <Text className="text-slate-700">Profil</Text>
        </Pressable>
      </View>

      <View className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <Text className="font-semibold text-slate-900">Aktivna tura</Text>
        {activeTour ? (
          <>
            <Text className="mt-2 text-base font-semibold text-slate-800">{activeTour.routeLabel}</Text>
            <Text className="mt-1 text-slate-600">{translateTourStatus(activeTour.status)}</Text>
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => router.push(`/tours/${activeTour.id}` as never)}
                className="rounded-lg border border-brand-500 px-3 py-2"
              >
                <Text className="text-brand-700">Detalji</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/tours/${activeTour.id}/expense` as never)}
                className="rounded-lg bg-brand-600 px-3 py-2"
              >
                <Text className="font-semibold text-white">Troskovnik</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text className="mt-2 text-slate-600">Nema aktivne ture.</Text>
        )}
      </View>

      <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <Text className="font-semibold text-slate-900">Predstojece ture</Text>
        <Text className="mt-2 text-slate-600">{upcomingCount} planirano u narednih 7 dana</Text>
      </View>

      <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <Text className="font-semibold text-slate-900">Neprocitana obavestenja</Text>
        <Text className="mt-2 text-slate-600">{unreadCount}</Text>
      </View>

      <Pressable onPress={onSignOut} className="mt-6 rounded-xl border border-red-300 px-4 py-3">
        <Text className="text-center font-semibold text-red-700">Odjavi se</Text>
      </Pressable>

      {isLoading ? <Text className="mt-4 text-slate-500">Osvezavanje podataka...</Text> : null}
      {isError ? (
        <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <Text className="text-red-700">Ucitanje podataka nije uspelo.</Text>
          <Pressable onPress={() => void refetch()} className="mt-2 self-start rounded-lg border border-red-300 px-3 py-2">
            <Text className="text-red-700">Pokusaj ponovo</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
