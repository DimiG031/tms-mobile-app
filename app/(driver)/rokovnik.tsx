import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import {
  useCreateRokovnik,
  useDeleteRokovnik,
  useRokovnik,
  useToggleRokovnik,
  useUpdateRokovnik,
  type RokovnikCategory,
  type RokovnikItem,
  type RokovnikPriority
} from "@/queries/useRokovnik";
import { formatDate } from "@/lib/formatters";
import { useTheme } from "@/providers/ThemeProvider";

const CATEGORIES: { value: RokovnikCategory; label: string }[] = [
  { value: "GENERAL", label: "Opšte" },
  { value: "PARKING", label: "Parking" },
  { value: "LEGAL", label: "Pravno" },
  { value: "PAYMENT", label: "Plaćanje" },
  { value: "FUEL", label: "Gorivo" },
  { value: "MAINTENANCE", label: "Održavanje" },
  { value: "OTHER", label: "Ostalo" }
];

const PRIORITIES: { value: RokovnikPriority; label: string; color: string }[] = [
  { value: "LOW", label: "Nizak", color: "#64748b" },
  { value: "NORMAL", label: "Srednji", color: "#2563eb" },
  { value: "HIGH", label: "Visok", color: "#d97706" },
  { value: "URGENT", label: "Hitno", color: "#dc2626" }
];

function categoryLabel(value?: string | null): string | null {
  if (!value) return null;
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function priorityMeta(value?: string | null) {
  return PRIORITIES.find((p) => p.value === value) ?? null;
}

function toYMD(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

type Draft = {
  title: string;
  note: string;
  date: string | null;
  category: RokovnikCategory;
  priority: RokovnikPriority;
};

function emptyDraft(): Draft {
  return { title: "", note: "", date: null, category: "GENERAL", priority: "NORMAL" };
}

export default function RokovnikScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: items = [], isLoading, isError } = useRokovnik();
  const createItem = useCreateRokovnik();
  const updateItem = useUpdateRokovnik();
  const toggleItem = useToggleRokovnik();
  const deleteItem = useDeleteRokovnik();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.date ?? "9999-99-99").localeCompare(b.date ?? "9999-99-99");
    });
  }, [items]);

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft());
    setShowDatePicker(false);
    setModalVisible(true);
  }

  function openEdit(item: RokovnikItem) {
    if (item.visibility !== "PRIVATE") return;
    setEditingId(item.id);
    setDraft({
      title: item.title,
      note: item.note ?? "",
      date: item.date,
      category: (item.category as RokovnikCategory) || "GENERAL",
      priority: (item.priority as RokovnikPriority) || "NORMAL"
    });
    setShowDatePicker(false);
    setModalVisible(true);
  }

  function onSave() {
    if (!draft.title.trim()) {
      Alert.alert("Rokovnik", "Unesi naslov.");
      return;
    }
    const payload = {
      title: draft.title,
      note: draft.note,
      date: draft.date,
      category: draft.category,
      priority: draft.priority
    };
    const onError = (error: unknown) =>
      Alert.alert("Rokovnik", error instanceof Error ? error.message : "Čuvanje nije uspelo.");

    if (editingId) {
      updateItem.mutate(
        { id: editingId, data: payload },
        { onSuccess: () => setModalVisible(false), onError }
      );
    } else {
      createItem.mutate(payload, { onSuccess: () => setModalVisible(false), onError });
    }
  }

  function onDelete(item: RokovnikItem) {
    Alert.alert("Brisanje", `Obrisati „${item.title}"?`, [
      { text: "Odustani", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: () =>
          deleteItem.mutate(item.id, {
            onError: (error) => Alert.alert("Rokovnik", error instanceof Error ? error.message : "Brisanje nije uspelo.")
          })
      }
    ]);
  }

  function onToggle(item: RokovnikItem) {
    if (item.visibility !== "PRIVATE") return;
    toggleItem.mutate({ id: item.id, done: !item.done });
  }

  const isSaving = createItem.isPending || updateItem.isPending;

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.surface.app }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 14, paddingBottom: 40 }}
    >
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text style={{ color: theme.text.primary, fontSize: 26, fontWeight: "800" }}>Rokovnik</Text>
          <Text className="mt-0.5 text-sm" style={{ color: theme.text.secondary }}>Tvoji podsetnici i zadaci.</Text>
        </View>
        <Pressable
          onPress={openCreate}
          className="flex-row items-center gap-1 rounded-full border px-3 py-2"
          style={{ borderColor: theme.accent.primary, backgroundColor: theme.accent.primaryLight }}
        >
          <Ionicons name="add" size={16} color={theme.accent.primaryDark} />
          <Text className="text-xs font-bold" style={{ color: theme.accent.primaryDark }}>Novi</Text>
        </Pressable>
      </View>

      {isLoading ? <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 24 }} /> : null}
      {isError ? <Text className="mt-4 text-red-600">Greška pri učitavanju rokovnika.</Text> : null}

      {!isLoading && !items.length ? (
        <View className="mt-4 rounded-2xl border border-dashed p-4" style={{ borderColor: theme.surface.border }}>
          <Text className="text-sm" style={{ color: theme.text.secondary }}>Nema zapisa. Dodaj prvi podsetnik dugmetom „Novi".</Text>
        </View>
      ) : null}

      <View className="mt-4 gap-2.5">
        {sortedItems.map((item) => {
          const editable = item.visibility === "PRIVATE";
          const prio = priorityMeta(item.priority);
          const hasBadges = Boolean(categoryLabel(item.category) || prio || !editable);
          return (
            <View key={item.id} className="rounded-2xl border p-3" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
              <View className="flex-row items-start gap-3">
                <Pressable onPress={() => onToggle(item)} disabled={!editable} className="pt-0.5">
                  <Ionicons
                    name={item.done ? "checkmark-circle" : "ellipse-outline"}
                    size={26}
                    color={item.done ? theme.accent.primary : theme.text.muted}
                  />
                </Pressable>
                <Pressable className="flex-1" onPress={() => openEdit(item)} disabled={!editable}>
                  <View className="flex-row items-center justify-between gap-2">
                    <Text
                      className="flex-1 text-base font-bold"
                      numberOfLines={1}
                      style={{ color: theme.text.primary, textDecorationLine: item.done ? "line-through" : "none" }}
                    >
                      {item.title}
                    </Text>
                    {item.date ? <Text className="text-xs" style={{ color: theme.text.muted }}>{formatDate(item.date)}</Text> : null}
                  </View>
                  {item.note ? <Text className="mt-0.5 text-sm" numberOfLines={2} style={{ color: theme.text.secondary }}>{item.note}</Text> : null}
                  {hasBadges ? (
                    <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
                      {categoryLabel(item.category) ? (
                        <Text className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: theme.surface.subtle, color: theme.text.secondary }}>
                          {categoryLabel(item.category)}
                        </Text>
                      ) : null}
                      {prio ? (
                        <Text className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${prio.color}22`, color: prio.color }}>
                          {prio.label}
                        </Text>
                      ) : null}
                      {!editable ? (
                        <Text className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: theme.surface.subtle, color: theme.text.muted }}>
                          {item.visibility === "COMPANY" ? "Firmski" : "Dodeljeno"}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
                {editable ? (
                  <Pressable onPress={() => onDelete(item)} className="pt-0.5">
                    <Ionicons name="trash-outline" size={18} color={theme.text.muted} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <ScrollView className="max-h-[90%] rounded-t-3xl px-4 pt-5" style={{ backgroundColor: theme.surface.card }} contentContainerStyle={{ paddingBottom: 32 }}>
            <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>{editingId ? "Izmena zapisa" : "Novi zapis"}</Text>

            <Text className="mt-4 text-xs" style={{ color: theme.text.secondary }}>Naslov</Text>
            <TextInput
              value={draft.title}
              onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
              placeholder="npr. Produži zeleni karton"
              placeholderTextColor={theme.text.muted}
              className="mt-1 rounded-xl border px-4 py-3"
              style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.app, color: theme.text.primary }}
            />

            <Text className="mt-4 text-xs" style={{ color: theme.text.secondary }}>Napomena (opciono)</Text>
            <TextInput
              value={draft.note}
              onChangeText={(note) => setDraft((d) => ({ ...d, note }))}
              placeholder="Detalji"
              placeholderTextColor={theme.text.muted}
              multiline
              className="mt-1 rounded-xl border px-4 py-3"
              style={{ minHeight: 80, textAlignVertical: "top", borderColor: theme.surface.border, backgroundColor: theme.surface.app, color: theme.text.primary }}
            />

            <Text className="mt-4 text-xs" style={{ color: theme.text.secondary }}>Datum</Text>
            <View className="mt-1 flex-row items-center gap-2">
              <Pressable
                onPress={() => setShowDatePicker((v) => !v)}
                className="flex-1 flex-row items-center justify-between rounded-xl border px-4 py-3"
                style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.app }}
              >
                <Text style={{ color: draft.date ? theme.text.primary : theme.text.muted }}>
                  {draft.date ? formatDate(draft.date) : "Bez datuma"}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={theme.text.muted} />
              </Pressable>
              {draft.date ? (
                <Pressable onPress={() => setDraft((d) => ({ ...d, date: null }))} className="rounded-xl border px-3 py-3" style={{ borderColor: theme.surface.border }}>
                  <Text style={{ color: theme.text.secondary }}>Obriši</Text>
                </Pressable>
              ) : null}
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={draft.date ? new Date(draft.date) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(_, selected) => {
                  if (Platform.OS !== "ios") setShowDatePicker(false);
                  if (selected) setDraft((d) => ({ ...d, date: toYMD(selected) }));
                }}
              />
            )}

            <Text className="mt-4 text-xs" style={{ color: theme.text.secondary }}>Kategorija</Text>
            <View className="mt-1 flex-row flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = draft.category === c.value;
                return (
                  <Pressable
                    key={c.value}
                    onPress={() => setDraft((d) => ({ ...d, category: c.value }))}
                    className="rounded-lg border px-3 py-2"
                    style={{ borderColor: active ? theme.accent.primary : theme.surface.border, backgroundColor: active ? theme.accent.primaryLight : theme.surface.app }}
                  >
                    <Text style={{ color: active ? theme.accent.primaryDark : theme.text.secondary }}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mt-4 text-xs" style={{ color: theme.text.secondary }}>Prioritet</Text>
            <View className="mt-1 flex-row gap-2">
              {PRIORITIES.map((p) => {
                const active = draft.priority === p.value;
                return (
                  <Pressable
                    key={p.value}
                    onPress={() => setDraft((d) => ({ ...d, priority: p.value }))}
                    className="flex-1 rounded-lg border px-2 py-2"
                    style={{ borderColor: active ? p.color : theme.surface.border, backgroundColor: active ? `${p.color}22` : theme.surface.app }}
                  >
                    <Text className="text-center text-xs font-semibold" style={{ color: active ? p.color : theme.text.secondary }}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-5 flex-row gap-2">
              <Pressable className="flex-1 rounded-xl border px-4 py-3" style={{ borderColor: theme.surface.border }} onPress={() => setModalVisible(false)}>
                <Text className="text-center font-semibold" style={{ color: theme.text.secondary }}>Odustani</Text>
              </Pressable>
              <Pressable className="flex-1 rounded-xl px-4 py-3 disabled:opacity-60" style={{ backgroundColor: theme.accent.primary }} onPress={onSave} disabled={isSaving}>
                <Text className="text-center font-semibold text-white">{isSaving ? "Čuvanje..." : "Sačuvaj"}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}
