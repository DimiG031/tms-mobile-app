import { useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ScrollView } from "react-native";
import * as Location from "expo-location";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import { useSosReport } from "@/queries/useSos";
import { Theme } from "@/lib/theme";

async function tryGetLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return null;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}

export default function TourSosScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const tourId = params.id;
  const router = useRouter();
  const sos = useSosReport();
  const [message, setMessage] = useState("");

  function onSendSos() {
    Alert.alert("Slanje SOS poziva", "Poslati hitan SOS poziv dispečeru?", [
      { text: "Odustani", style: "cancel" },
      {
        text: "Pošalji SOS",
        style: "destructive",
        onPress: async () => {
          const location = await tryGetLocation();
          sos.mutate(
            {
              tourId,
              latitude: location?.latitude ?? null,
              longitude: location?.longitude ?? null,
              message
            },
            {
              onSuccess: (result) => {
                const text = result.queued
                  ? "Nema mreže — SOS je sačuvan i biće poslat čim se uspostavi veza."
                  : "Dispečer je obavešten o tvom hitnom pozivu.";
                Alert.alert("SOS", text, [{ text: "U redu", onPress: () => router.back() }]);
              },
              onError: (error) => {
                const text = error instanceof Error ? error.message : "Slanje SOS poziva nije uspelo.";
                Alert.alert("SOS", text);
              }
            }
          );
        }
      }
    ]);
  }

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: Theme.surface.app }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "SOS" }} />

      <View className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <Text className="text-lg font-extrabold text-red-700">Hitan SOS poziv</Text>
        <Text className="mt-1 text-sm leading-5 text-red-700">
          Slanjem SOS poziva odmah obaveštavaš dispečera o problemu na putu. Uz poziv se šalje tvoja trenutna GPS
          lokacija ako je dozvoljen pristup lokaciji.
        </Text>
      </View>

      <Text className="mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: Theme.text.secondary }}>
        Poruka (opciono)
      </Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Opiši ukratko šta se dešava"
        multiline
        numberOfLines={4}
        className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
        style={{ minHeight: 96, textAlignVertical: "top" }}
      />

      <Pressable
        onPress={onSendSos}
        disabled={sos.isPending}
        className="mt-6 rounded-2xl bg-red-600 px-4 py-4 disabled:opacity-60"
      >
        <Text className="text-center text-lg font-extrabold text-white">
          {sos.isPending ? "Slanje..." : "Pošalji SOS"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
