import { useMemo, useState } from "react";
import { Link } from "expo-router";
import { RefreshControl, ScrollView } from "react-native";
import { Pressable, Text, View } from "@/components/ui";
import { useTours } from "@/queries/useTours";
import { useTheme } from "@/providers/ThemeProvider";
import { formatRouteLabel, formatTourDateRange, translateTourStatus } from "@/lib/formatters";

const FILTERS = ["Sve", "Aktivne", "Planirane", "Završene"] as const;
type FilterType = (typeof FILTERS)[number];

function matchFilter(filter: FilterType, status: string): boolean {
  if (filter === "Sve") return true;
  if (filter === "Aktivne") return status === "IN_TRANSIT" || status === "CONFIRMED";
  if (filter === "Planirane") return status === "PLANNED";
  if (filter === "Završene") return status === "COMPLETED";
  return false;
}

export default function ToursListScreen() {
  const theme = useTheme();
  const { data, isLoading, isError, refetch } = useTours();
  const [filter, setFilter] = useState<FilterType>("Sve");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredTours = useMemo(() => {
    return (data ?? []).filter((tour) => matchFilter(filter, tour.status));
  }, [data, filter]);

  async function onRefresh() {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.surface.app }}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void onRefresh()}
          tintColor={theme.accent.primary}
          colors={[theme.accent.primary]}
        />
      }
    >
      <View className="px-4 pb-3 pt-5">
        <Text className="text-4xl font-extrabold" style={{ color: theme.text.primary }}>
          Moje ture
        </Text>
        <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>
          {data?.length ?? 0} ukupno
        </Text>
      </View>

      <View className="px-4 pb-3">
        <View className="flex-row flex-wrap gap-2">
          {FILTERS.map((item) => {
            const active = filter === item;
            return (
              <Pressable
                key={item}
                onPress={() => setFilter(item)}
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: active ? theme.accent.primary : theme.surface.subtle }}
              >
                <Text className="text-xs font-semibold" style={{ color: active ? "#fff" : theme.text.secondary }}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="px-4 pb-5">
        {isLoading ? <Text className="mb-3 text-slate-500 dark:text-slate-400">Učitavanje tura...</Text> : null}
        {isError ? <Text className="mb-3 text-red-600">Greška pri učitavanju tura.</Text> : null}

        {filteredTours.map((tour) => (
          <Link href={`/(driver)/tours/${tour.id}`} asChild key={tour.id}>
            <Pressable
              className="mb-3 rounded-2xl border p-4"
              style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatRouteLabel(tour.routeLabel)}</Text>
                  <Text className="mt-1 text-sm text-slate-600 dark:text-slate-400">{formatTourDateRange(tour.dateLabel)}</Text>
                </View>
                <View
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: theme.status[tour.status as keyof typeof theme.status]?.bg ?? "#e2e8f0" }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: theme.status[tour.status as keyof typeof theme.status]?.text ?? "#334155" }}
                  >
                    {translateTourStatus(tour.status)}
                  </Text>
                </View>
              </View>
            </Pressable>
          </Link>
        ))}

        {!filteredTours.length && !isLoading ? (
          <Text className="text-slate-500 dark:text-slate-400">Nema tura za izabrani filter.</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
