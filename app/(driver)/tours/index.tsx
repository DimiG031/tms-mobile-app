import { Link } from "expo-router";
import { FlatList, RefreshControl } from "react-native";
import { Pressable, Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useTours } from "@/queries/useTours";
import { tourStatusClass, translateTourStatus } from "@/lib/formatters";

export default function ToursListScreen() {
  const { session } = useAuth();
  const { data, isLoading, isError, isRefetching, refetch } = useTours(session?.user.driverId);
  const tours = data ?? [];

  return (
    <View className="flex-1 bg-white px-4 py-5">
      <Text className="mb-3 text-xl font-bold text-slate-900">Moje ture</Text>

      {isLoading ? <Text className="mb-3 text-slate-500">Ucitavanje tura...</Text> : null}
      {isError ? (
        <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <Text className="text-red-700">Ucitavanje tura nije uspelo.</Text>
          <Pressable onPress={() => void refetch()} className="mt-2 self-start rounded-lg border border-red-300 px-3 py-2">
            <Text className="text-red-700">Pokusaj ponovo</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={tours}
        keyExtractor={(tour) => tour.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: tours.length ? 0 : 1 }}
        renderItem={({ item: tour }) => (
          <Link href={`/tours/${tour.id}`} asChild>
            <Pressable className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Text className="font-semibold text-slate-900">{tour.routeLabel}</Text>
              <Text className="mt-1 text-slate-600">{tour.dateLabel}</Text>
              <View className="mt-2 self-start rounded-full px-2.5 py-1">
                <Text className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tourStatusClass(tour.status)}`}>
                  {translateTourStatus(tour.status)}
                </Text>
              </View>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6">
              <Text className="text-center text-slate-600">Trenutno nema dodeljenih tura.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
