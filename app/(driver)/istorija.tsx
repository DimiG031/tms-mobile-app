import { useState } from "react";
import { Stack, useRouter } from "expo-router";
import { ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import { useToursSummary, type ToursSummaryBucket } from "@/queries/useToursSummary";
import { useToursHistory } from "@/queries/useToursHistory";
import { formatRouteLabel, translateTourStatus, tourStatusClass } from "@/lib/formatters";
import { useTheme } from "@/providers/ThemeProvider";

type PeriodKey = "week" | "month" | "year" | "total";
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "week", label: "Sedmica" },
  { key: "month", label: "Mesec" },
  { key: "year", label: "Godina" },
  { key: "total", label: "Ukupno" }
];

type StatusKey = "ALL" | "COMPLETED" | "CANCELED";
const STATUS_FILTERS: { key: StatusKey; label: string; value: string | null }[] = [
  { key: "ALL", label: "Sve", value: null },
  { key: "COMPLETED", label: "Završene", value: "COMPLETED" },
  { key: "CANCELED", label: "Otkazane", value: "CANCELED" }
];

function formatKm(value: number): string {
  return new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 0 }).format(value);
}

function DashboardCard({ bucket, periodLabel }: Readonly<{ bucket?: ToursSummaryBucket; periodLabel: string }>) {
  const theme = useTheme();
  return (
    <View className="rounded-2xl border p-4" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
      <Text className="text-[12px] font-bold uppercase" style={{ color: theme.text.secondary }}>
        {bucket?.label ? `${periodLabel} · ${bucket.label}` : periodLabel}
      </Text>
      <View className="mt-3 flex-row">
        <View className="flex-1 items-center">
          <Text className="text-2xl font-extrabold" style={{ color: theme.text.primary }}>{bucket?.tours ?? 0}</Text>
          <Text className="text-xs" style={{ color: theme.text.secondary }}>ture</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-2xl font-extrabold" style={{ color: theme.text.primary }}>{formatKm(bucket?.km ?? 0)}</Text>
          <Text className="text-xs" style={{ color: theme.text.secondary }}>km</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-2xl font-extrabold" style={{ color: theme.text.primary }}>{bucket?.completed ?? 0}</Text>
          <Text className="text-xs" style={{ color: theme.text.secondary }}>završeno</Text>
        </View>
      </View>
      <View className="mt-3 border-t pt-2" style={{ borderTopColor: theme.surface.border }}>
        <Text className="text-sm" style={{ color: theme.text.secondary }}>U toku: {bucket?.activeTours ?? 0}</Text>
      </View>
    </View>
  );
}

export default function IstorijaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const summaryQuery = useToursSummary();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [statusKey, setStatusKey] = useState<StatusKey>("ALL");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [isRefreshing, setRefreshing] = useState(false);

  const statusValue = STATUS_FILTERS.find((item) => item.key === statusKey)?.value ?? null;
  const historyQuery = useToursHistory({ status: statusValue, q: submittedSearch });

  const bucket = summaryQuery.data?.[period];
  const periodLabel = PERIODS.find((item) => item.key === period)?.label ?? "";
  const tours = historyQuery.data?.pages.flatMap((page) => page.items) ?? [];

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([summaryQuery.refetch(), historyQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.surface.app }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void onRefresh()}
          tintColor={theme.accent.primary}
          colors={[theme.accent.primary]}
        />
      }
    >
      <Stack.Screen options={{ title: "Istorija" }} />
      <Text className="text-3xl font-extrabold" style={{ color: theme.text.primary }}>Istorija</Text>
      <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>Pregled rada i sve tvoje ture.</Text>

      {/* Period tabs */}
      <View className="mt-4 flex-row gap-2">
        {PERIODS.map((item) => {
          const active = period === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setPeriod(item.key)}
              className="flex-1 rounded-full px-2 py-2"
              style={{ backgroundColor: active ? theme.accent.primary : theme.surface.card, borderColor: theme.surface.border, borderWidth: 1 }}
            >
              <Text className="text-center text-xs font-semibold" style={{ color: active ? "#fff" : theme.text.primary }} numberOfLines={1}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-3">
        {summaryQuery.isLoading ? (
          <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 16 }} />
        ) : (
          <DashboardCard bucket={bucket} periodLabel={periodLabel} />
        )}
      </View>

      {/* Search */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => setSubmittedSearch(search)}
        returnKeyType="search"
        placeholder="Pretraga tura (relacija, roba...)"
        placeholderTextColor={theme.text.muted}
        className="mt-4 rounded-xl border px-4 py-3"
        style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card, color: theme.text.primary }}
      />

      {/* Status filter */}
      <View className="mt-3 flex-row gap-2">
        {STATUS_FILTERS.map((item) => {
          const active = statusKey === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setStatusKey(item.key)}
              className="flex-1 rounded-lg border px-3 py-2"
              style={{ backgroundColor: active ? theme.accent.primarySoft : theme.surface.card, borderColor: active ? theme.accent.primary : theme.surface.border }}
            >
              <Text className="text-center text-sm font-semibold" style={{ color: active ? theme.accent.primaryDark : theme.text.secondary }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* History list */}
      <Text className="mb-2 mt-5 text-[12px] font-bold uppercase" style={{ color: theme.text.secondary }}>Istorija tura</Text>

      {historyQuery.isLoading ? <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 16 }} /> : null}
      {historyQuery.isError ? <Text className="text-red-600">Greška pri učitavanju tura.</Text> : null}

      {!historyQuery.isLoading && !tours.length ? (
        <View className="rounded-xl border border-dashed p-4" style={{ borderColor: theme.surface.border }}>
          <Text className="text-sm" style={{ color: theme.text.secondary }}>Nema tura za izabrane filtere.</Text>
        </View>
      ) : null}

      <View className="gap-2">
        {tours.map((tour) => (
          <Pressable
            key={tour.id}
            onPress={() => router.push(`/(driver)/tours/${tour.id}` as never)}
            className="rounded-xl border p-3"
            style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}
          >
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1 text-base font-extrabold" style={{ color: theme.text.primary }} numberOfLines={1}>
                {formatRouteLabel(tour.routeLabel)}
              </Text>
              <Text className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tourStatusClass(tour.status)}`}>
                {translateTourStatus(tour.status)}
              </Text>
            </View>
            <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>
              {tour.dateLabel}
              {tour.distanceKm ? ` · ${formatKm(tour.distanceKm)} km` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {historyQuery.hasNextPage ? (
        <Pressable
          onPress={() => void historyQuery.fetchNextPage()}
          disabled={historyQuery.isFetchingNextPage}
          className="mt-4 rounded-xl border px-4 py-3"
          style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}
        >
          <Text className="text-center font-semibold" style={{ color: theme.accent.primary }}>
            {historyQuery.isFetchingNextPage ? "Učitavanje..." : "Učitaj još"}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
