import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Alert } from "react-native";
import { Pressable, Text, View } from "@/components/ui";
import { useExpenseSheet } from "@/queries/useExpenseSheet";
import { useTourDetails, useUpdateTourStatus } from "@/queries/useTourDetails";
import { tourStatusClass, translateTourStatus } from "@/lib/formatters";

export default function TourDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tourId = params.id;

  const { data, isLoading, isError, refetch } = useTourDetails(tourId);
  const { data: sheet } = useExpenseSheet(tourId);
  const updateStatus = useUpdateTourStatus(tourId);

  const nextStatusLabel = getNextStatusLabel(data?.status);
  const mustLockSheetBeforeComplete =
    nextStatusLabel?.nextStatus === "COMPLETED" && sheet?.status === "OPEN";

  const onUpdateStatus = () => {
    if (!nextStatusLabel) return;
    if (mustLockSheetBeforeComplete) return;

    updateStatus.mutate(
      { status: nextStatusLabel.nextStatus, vehicleId: data?.vehicleId ?? null },
      {
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Promena statusa nije uspela";

          if (message.includes("Troskovnik mora biti zakljucan prije zavrsetka ture")) {
            Alert.alert("Promena statusa", message, [
              { text: "Otvori troskovnik", onPress: () => router.push(`/tours/${tourId}/expense` as never) },
              { text: "U redu", style: "cancel" }
            ]);
            return;
          }

          Alert.alert("Promena statusa", message);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white px-4 py-5">
        <Text className="text-slate-600">Ucitavanje detalja ture...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-white px-4 py-5">
        <Text className="text-red-700">Ucitavanje detalja ture nije uspelo.</Text>
        <Pressable onPress={() => void refetch()} className="mt-3 self-start rounded-lg border border-red-300 px-3 py-2">
          <Text className="text-red-700">Pokusaj ponovo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-4 py-5">
      <Text className="text-xl font-bold text-slate-900">{data?.routeLabel ?? "Detalji ture"}</Text>
      <Text className="mt-1 text-slate-600">{data?.dateLabel}</Text>
      <Text className={`mt-2 self-start rounded-full px-3 py-1 text-xs font-semibold ${tourStatusClass(data?.status)}`}>
        {translateTourStatus(data?.status)}
      </Text>
      <Text className="mt-2 text-slate-500">Vozilo: {data?.vehicleLabel ?? "-"}</Text>
      <Text className="text-slate-500">Prikolica: {data?.trailerLabel ?? "-"}</Text>
      <Text className="text-slate-500">Nalog: {data?.freightOrderCode ?? "-"}</Text>
      <Text className="mt-2 text-slate-500">Napomene: {data?.notes ?? "-"}</Text>

      {nextStatusLabel ? (
        <>
          <Pressable
            className="mt-5 rounded-xl bg-brand-600 px-4 py-3 disabled:opacity-60"
            onPress={onUpdateStatus}
            disabled={updateStatus.isPending || mustLockSheetBeforeComplete}
          >
            <Text className="text-center font-semibold text-white">
              {updateStatus.isPending ? "Azuriranje..." : nextStatusLabel.buttonLabel}
            </Text>
          </Pressable>
          {mustLockSheetBeforeComplete ? (
            <Text className="mt-2 text-sm text-amber-700">Prvo zakljucaj troskovnik.</Text>
          ) : null}
        </>
      ) : null}

      <View className="mt-5 flex-row gap-3">
        <Link href={`/tours/${tourId}/expense`} asChild>
          <Pressable className="rounded-xl border border-slate-300 px-4 py-3">
            <Text className="font-semibold text-slate-700">Troskovnik</Text>
          </Pressable>
        </Link>
        <Link href={`/tours/${tourId}/documents`} asChild>
          <Pressable className="rounded-xl border border-slate-300 px-4 py-3">
            <Text className="font-semibold text-slate-700">Dokumenta</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function getNextStatusLabel(status?: string): { buttonLabel: string; nextStatus: string } | null {
  if (status === "PLANNED") return { buttonLabel: "Potvrdi polazak", nextStatus: "CONFIRMED" };
  if (status === "CONFIRMED") return { buttonLabel: "Krenuo sam", nextStatus: "IN_TRANSIT" };
  if (status === "IN_TRANSIT") return { buttonLabel: "Stigao sam", nextStatus: "COMPLETED" };
  return null;
}
