import { useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ScrollView } from "react-native";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import { useReportTourIssue } from "@/queries/useTourIssue";
import { useTourStops } from "@/queries/useTourStops";
import type { TourIssueSeverity, TourIssueType } from "@/lib/types";
import { Theme } from "@/lib/theme";

const ISSUE_TYPES: { value: TourIssueType; label: string }[] = [
  { value: "DELAY", label: "Kašnjenje" },
  { value: "ACCIDENT", label: "Nezgoda" },
  { value: "DOCUMENT_PROBLEM", label: "Problem sa dokumentima" },
  { value: "VEHICLE_PROBLEM", label: "Kvar vozila" },
  { value: "CUSTOMS_PROBLEM", label: "Problem na carini" },
  { value: "OTHER", label: "Ostalo" }
];

const SEVERITIES: { value: TourIssueSeverity; label: string }[] = [
  { value: "LOW", label: "Nizak" },
  { value: "NORMAL", label: "Srednji" },
  { value: "HIGH", label: "Visok" }
];

export default function TourIssuesScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const tourId = params.id;
  const router = useRouter();
  const reportIssue = useReportTourIssue(tourId);
  const { data: stops } = useTourStops(tourId);
  const selectableStops = (stops ?? []).filter((stop) => Boolean(stop.id));

  const [type, setType] = useState<TourIssueType>("DELAY");
  const [severity, setSeverity] = useState<TourIssueSeverity>("NORMAL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stopId, setStopId] = useState<string | null>(null);

  function onSubmit() {
    if (!title.trim()) {
      Alert.alert("Prijava problema", "Unesi kratak naslov problema.");
      return;
    }
    reportIssue.mutate(
      { type, severity, title, description, stopId },
      {
        onSuccess: () => {
          Alert.alert("Prijava poslata", "Operativni tim je obavešten o problemu.", [
            { text: "U redu", onPress: () => router.back() }
          ]);
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Slanje prijave nije uspelo.";
          Alert.alert("Prijava problema", message);
        }
      }
    );
  }

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: Theme.surface.app }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Prijavi problem" }} />

      <Text className="text-2xl font-extrabold" style={{ color: Theme.text.primary }}>Prijavi problem sa ture</Text>
      <Text className="mt-1 text-sm" style={{ color: Theme.text.secondary }}>
        Obavesti dispečera o problemu kako bi mogao da reaguje na vreme.
      </Text>

      <Text className="mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: Theme.text.secondary }}>Tip problema</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {ISSUE_TYPES.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setType(option.value)}
            className={`rounded-lg border px-3 py-2 ${type === option.value ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"}`}
          >
            <Text className={type === option.value ? "text-brand-700" : "text-slate-700"}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text className="mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: Theme.text.secondary }}>Hitnost</Text>
      <View className="mt-2 flex-row gap-2">
        {SEVERITIES.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setSeverity(option.value)}
            className={`flex-1 rounded-lg border px-3 py-2 ${severity === option.value ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"}`}
          >
            <Text className={`text-center ${severity === option.value ? "text-brand-700" : "text-slate-700"}`}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {selectableStops.length ? (
        <>
          <Text className="mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: Theme.text.secondary }}>Stanica (opciono)</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => setStopId(null)}
              className={`rounded-lg border px-3 py-2 ${stopId === null ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"}`}
            >
              <Text className={stopId === null ? "text-brand-700" : "text-slate-700"}>Bez stanice</Text>
            </Pressable>
            {selectableStops.map((stop) => (
              <Pressable
                key={stop.id}
                onPress={() => setStopId(stop.id)}
                className={`rounded-lg border px-3 py-2 ${stopId === stop.id ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"}`}
              >
                <Text className={stopId === stop.id ? "text-brand-700" : "text-slate-700"}>
                  {stop.sequence}. {stop.locationName ?? stop.city ?? "Stanica"}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Text className="mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: Theme.text.secondary }}>Naslov</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="npr. Kašnjenje na utovaru"
        className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
      />

      <Text className="mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: Theme.text.secondary }}>Opis (opciono)</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Detaljnije opiši problem"
        multiline
        numberOfLines={4}
        className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
        style={{ minHeight: 96, textAlignVertical: "top" }}
      />

      <Pressable
        onPress={onSubmit}
        disabled={reportIssue.isPending}
        className="mt-6 rounded-2xl px-4 py-4 disabled:opacity-60"
        style={{ backgroundColor: Theme.accent.primary }}
      >
        <Text className="text-center text-lg font-extrabold text-white">
          {reportIssue.isPending ? "Slanje..." : "Pošalji prijavu"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
