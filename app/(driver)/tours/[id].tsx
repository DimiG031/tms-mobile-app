import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "@/components/ui";
import { useTourDetails, useUpdateTourStatus } from "@/queries/useTourDetails";
import { useExpenseSheet } from "@/queries/useExpenseSheet";
import { Theme } from "@/lib/theme";
import { formatRouteLabel, formatTourDateRange, translateTourStatus } from "@/lib/formatters";

function statusStep(status?: string) {
  const normalized = status?.toUpperCase();
  if (normalized === "PLANNED") return 1;
  if (normalized === "CONFIRMED") return 2;
  if (normalized === "IN_TRANSIT") return 3;
  if (normalized === "COMPLETED") return 4;
  return 1;
}

function getNextStatusLabel(status?: string): { buttonLabel: string; nextStatus: string } | null {
  const normalized = status?.toUpperCase();
  if (normalized === "PLANNED") return { buttonLabel: "Potvrdi polazak", nextStatus: "CONFIRMED" };
  if (normalized === "CONFIRMED") return { buttonLabel: "Krenuo sam", nextStatus: "IN_TRANSIT" };
  if (normalized === "IN_TRANSIT") return { buttonLabel: "Stigao sam", nextStatus: "COMPLETED" };
  return null;
}

function BackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace("/(driver)/tours");
      }}
      style={{ paddingRight: 8 }}
    >
      <Ionicons name="chevron-back" size={26} color="#0d7d72" />
    </Pressable>
  );
}

const headerLeft = () => <BackButton />;

export default function TourDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const tourId = params.id;
  const { data } = useTourDetails(tourId);
  const { data: sheet } = useExpenseSheet(tourId);
  const updateStatus = useUpdateTourStatus(tourId);

  const step = statusStep(data?.status);
  const nextStatus = getNextStatusLabel(data?.status);
  const blockComplete = data?.status?.toUpperCase() === "IN_TRANSIT" && sheet?.status === "OPEN";

  const onUpdateStatus = () => {
    if (!nextStatus || !data) return;
    updateStatus.mutate(
      { status: nextStatus.nextStatus, vehicleId: data.vehicleId ?? null },
      {
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Promena statusa nije uspela";
          Alert.alert("Status ture", message);
        }
      }
    );
  };

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: Theme.surface.app }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ headerLeft }} />
      <Text className="text-4xl font-extrabold text-slate-900">
        {data?.routeLabel ? formatRouteLabel(data.routeLabel) : "Detalji ture"}
      </Text>

      <View className="mt-4 rounded-2xl border p-4" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status ture</Text>
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: Theme.accent.badgeBg }}>
            <Text className="text-xs font-semibold" style={{ color: Theme.accent.badgeText }}>
              {translateTourStatus(data?.status)}
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row items-center gap-2">
          {[1, 2, 3, 4].map((index) => (
            <View key={index} className="flex-1 rounded-full" style={{ height: 10, backgroundColor: index <= step ? Theme.accent.primary : "#cbd5e1" }} />
          ))}
        </View>

        {nextStatus ? (
          <Pressable
            onPress={onUpdateStatus}
            disabled={updateStatus.isPending || blockComplete}
            className="mt-4 rounded-xl px-4 py-3 disabled:opacity-60"
            style={{ backgroundColor: Theme.accent.primary }}
          >
            <Text className="text-center text-base font-semibold text-white">
              {updateStatus.isPending ? "Ažuriranje..." : nextStatus.buttonLabel}
            </Text>
          </Pressable>
        ) : null}

        {blockComplete ? (
          <Text className="mt-2 text-sm font-semibold text-amber-700">Prvo zaključi troškovnik.</Text>
        ) : null}
      </View>

      <View className="mt-3 rounded-2xl border p-4" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Detalji</Text>
        <View className="flex-row justify-between border-b border-slate-200 py-2">
          <Text className="text-slate-500">Vozilo</Text>
          <Text className="font-semibold text-slate-900">{data?.vehicleLabel ?? "-"}</Text>
        </View>
        <View className="flex-row justify-between border-b border-slate-200 py-2">
          <Text className="text-slate-500">Prikolica</Text>
          <Text className="font-semibold text-slate-900">{data?.trailerLabel ?? "-"}</Text>
        </View>
        <View className="flex-row justify-between border-b border-slate-200 py-2">
          <Text className="text-slate-500">Nalog</Text>
          <Text className="font-semibold text-slate-900">{data?.freightOrderCode ?? "-"}</Text>
        </View>
        <View className="flex-row justify-between py-2">
          <Text className="text-slate-500">Datum</Text>
          <Text className="font-semibold text-slate-900">{formatTourDateRange(data?.dateLabel)}</Text>
        </View>
        <Text className="mt-2 text-slate-700">Napomene: {data?.notes ?? "-"}</Text>
      </View>

      <View className="mt-4 gap-3">
        <Link href={`/(driver)/tours/${tourId}/details`} asChild>
          <Pressable className="rounded-xl px-4 py-3" style={{ backgroundColor: "#0f766e" }}>
            <Text className="text-center font-semibold text-white">Detaljnije</Text>
          </Pressable>
        </Link>

        <View className="flex-row gap-3">
          <Link href={`/(driver)/tours/${tourId}/expense`} asChild>
            <Pressable className="flex-1 rounded-xl px-4 py-3" style={{ backgroundColor: Theme.accent.primary }}>
              <Text className="text-center font-semibold text-white">Troškovi</Text>
            </Pressable>
          </Link>
          <Link href={`/(driver)/tours/${tourId}/documents`} asChild>
            <Pressable className="flex-1 rounded-xl px-4 py-3" style={{ backgroundColor: "#1f4e92" }}>
              <Text className="text-center font-semibold text-white">Dokumenta</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
