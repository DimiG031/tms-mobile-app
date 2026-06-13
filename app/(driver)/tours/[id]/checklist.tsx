import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "@/components/ui";
import { useTourChecklist, useToggleChecklistItem } from "@/queries/useTourChecklist";
import type { TourChecklistItem } from "@/lib/types";
import { useTheme } from "@/providers/ThemeProvider";

export default function TourChecklistScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const tourId = params.id;
  const theme = useTheme();
  const { data: checklist, isLoading, isError } = useTourChecklist(tourId);
  const toggleItem = useToggleChecklistItem(tourId);

  function onToggle(item: TourChecklistItem) {
    toggleItem.mutate(
      { itemId: item.id, completed: !item.completed },
      {
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Izmena checkliste nije uspela.";
          Alert.alert("Checklist", message);
        }
      }
    );
  }

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: theme.surface.app }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Checklist" }} />

      <Text className="text-2xl font-extrabold" style={{ color: theme.text.primary }}>Checklist vozača</Text>
      <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>
        Proveri obavezne stavke pre i tokom ture.
      </Text>

      {isLoading ? <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 24 }} /> : null}
      {isError ? <Text className="mt-5 text-red-600">Greška pri učitavanju checkliste.</Text> : null}

      {checklist ? (
        <>
          <View className="mt-4 rounded-xl border p-4" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
            <Text className="text-sm" style={{ color: theme.text.secondary }}>
              Završeno: {checklist.completedCount}/{checklist.items.length}
            </Text>
            {checklist.requiredRemaining > 0 ? (
              <Text className="mt-1 text-sm font-semibold text-amber-700">
                Preostalo obaveznih: {checklist.requiredRemaining}
              </Text>
            ) : (
              <Text className="mt-1 text-sm font-semibold text-emerald-700">Sve obavezne stavke su završene.</Text>
            )}
          </View>

          <View className="mt-4 gap-2">
            {checklist.items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onToggle(item)}
                disabled={toggleItem.isPending}
                className="flex-row items-center gap-3 rounded-xl border p-4"
                style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}
              >
                <Ionicons
                  name={item.completed ? "checkbox" : "square-outline"}
                  size={24}
                  color={item.completed ? theme.accent.primary : theme.text.muted}
                />
                <View className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>{item.label}</Text>
                  {item.required ? (
                    <Text className="mt-0.5 text-xs font-semibold text-amber-700">Obavezno</Text>
                  ) : (
                    <Text className="mt-0.5 text-xs" style={{ color: theme.text.secondary }}>Opciono</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
