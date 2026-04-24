import { useMemo, useState } from "react";
import { Link } from "expo-router";
import { Pressable, Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useTours } from "@/queries/useTours";
import { Theme } from "@/lib/theme";
import { formatRouteLabel, formatTourDateRange, translateTourStatus } from "@/lib/formatters";

const FILTERS = ["Sve", "Aktivne", "Planirane", "Zavrsene"] as const;
type FilterType = (typeof FILTERS)[number];

function matchFilter(filter: FilterType, status: string): boolean {
  if (filter === "Sve") return true;
  if (filter === "Aktivne") return status === "IN_TRANSIT" || status === "CONFIRMED";
  if (filter === "Planirane") return status === "PLANNED";
  return status === "COMPLETED";
}

export default function ToursListScreen() {
  const { session } = useAuth();
  const { data, isLoading, isError } = useTours(session?.user.driverId);
  const [filter, setFilter] = useState<FilterType>("Sve");

  const filteredTours = useMemo(() => {
    return (data ?? []).filter((tour) => matchFilter(filter, tour.status));
  }, [data, filter]);

  return (
    <View className="flex-1" style={{ backgroundColor: Theme.surface.app }}>
      <View className="px-4 pb-3 pt-5">
        <Text className="text-4xl font-extrabold" style={{ color: Theme.text.primary }}>
          Moje ture
        </Text>
        <Text className="mt-1 text-sm" style={{ color: Theme.text.secondary }}>
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
                style={{
                  backgroundColor: active ? Theme.accent.primary : "#e7edf3"
                }}
              >
                <Text className="text-xs font-semibold" style={{ color: active ? "#fff" : "#3f556f" }}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="px-4 pb-5">
        {isLoading ? <Text className="mb-3 text-slate-500">Ucitavanje tura...</Text> : null}
        {isError ? <Text className="mb-3 text-red-600">Greska pri ucitavanju tura.</Text> : null}

        {filteredTours.map((tour) => (
          <Link href={`/(driver)/tours/${tour.id}`} asChild key={tour.id}>
            <Pressable className="mb-3 rounded-2xl border p-4" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-slate-900">{formatRouteLabel(tour.routeLabel)}</Text>
                  <Text className="mt-1 text-sm text-slate-600">{formatTourDateRange(tour.dateLabel)}</Text>
                </View>
                <View className="rounded-full px-3 py-1" style={{ backgroundColor: Theme.status[tour.status as keyof typeof Theme.status]?.bg ?? "#e2e8f0" }}>
                  <Text className="text-xs font-semibold" style={{ color: Theme.status[tour.status as keyof typeof Theme.status]?.text ?? "#334155" }}>
                    {translateTourStatus(tour.status)}
                  </Text>
                </View>
              </View>
            </Pressable>
          </Link>
        ))}

        {!filteredTours.length && !isLoading ? <Text className="text-slate-500">Nema tura za izabrani filter.</Text> : null}
      </View>
    </View>
  );
}

