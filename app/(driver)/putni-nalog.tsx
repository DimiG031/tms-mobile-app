import { useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Alert, Modal, Platform, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import {
  travelOrderPurposeLabel,
  useAddTravelEvent,
  useCompanyLocations,
  useCountries,
  useReturnTravelOrder,
  useTravelOrders,
  type TravelEventType,
  type TravelOrder,
  type TravelOrderEvent
} from "@/queries/useTravelOrders";
import { useRespondLineEditRequest, useTravelOrderLines } from "@/queries/useTravelOrderLines";
import { canSwitchDriver, canWriteAsCrew, crewBadgeLabel, crewRole } from "@/lib/crew";
import { useMyDriverId, useSwitchTravelOrderDriver } from "@/queries/useCrew";
import { useTours } from "@/queries/useTours";
import { formatDateTime } from "@/lib/formatters";
import { useTheme } from "@/providers/ThemeProvider";
import type { AppTheme } from "@/providers/ThemeProvider";
import type { Tour } from "@/lib/types";

type IconName = ComponentProps<typeof Ionicons>["name"];

const EVENT_TYPES: { value: TravelEventType; label: string; icon: IconName }[] = [
  { value: "BORDER", label: "Granica", icon: "flag-outline" },
  { value: "LOAD", label: "Utovar", icon: "download-outline" },
  { value: "UNLOAD", label: "Istovar", icon: "arrow-up-outline" },
  { value: "FUEL", label: "Gorivo", icon: "water-outline" },
  { value: "ODOMETER", label: "Kilometraža", icon: "speedometer-outline" },
  { value: "REST", label: "Pauza", icon: "bed-outline" },
  { value: "NOTE", label: "Beleška", icon: "create-outline" },
  { value: "HANDOVER", label: "Primopredaja", icon: "swap-horizontal-outline" }
];

// Odluka vlasnika 2026-10-16: utovar/istovar/pauza/kilometraza se unose kao red
// putnog lista, ne kao dogadjaj. Dugmad nude samo ono sto red ne hvata.
// EVENT_TYPES namerno ostaje pun — stari zapisi moraju da imaju labelu i ikonu.
const QUICK_EVENT_VALUES: TravelEventType[] = ["BORDER", "FUEL", "HANDOVER", "NOTE"];
const QUICK_EVENT_TYPES = EVENT_TYPES.filter((et) => QUICK_EVENT_VALUES.includes(et.value));

function rowCountLabel(count: number): string {
  if (!count) return "prazan";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} red`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} reda`;
  return `${count} redova`;
}

const CURRENCIES = ["EUR", "RSD", "USD", "CHF"];

function eventMeta(type: string): { label: string; icon: IconName } {
  const found = EVENT_TYPES.find((e) => e.value === type);
  return found ? { label: found.label, icon: found.icon } : { label: type, icon: "ellipse-outline" };
}

function statusMeta(theme: AppTheme, status: string): { label: string; bg: string; text: string } {
  if (status === "OPEN") return { label: "Otvoren", bg: theme.status.PLANNED.bg, text: theme.status.PLANNED.text };
  if (status === "ON_ROAD") return { label: "Na putu", bg: theme.status.IN_TRANSIT.bg, text: theme.status.IN_TRANSIT.text };
  if (status === "RETURNED") return { label: "Vraćen", bg: theme.status.COMPLETED.bg, text: theme.status.COMPLETED.text };
  if (status === "CLOSED") return { label: "Zatvoren", bg: theme.status.CANCELLED.bg, text: theme.status.CANCELLED.text };
  return { label: status, bg: theme.surface.subtle, text: theme.text.secondary };
}

function parseNum(value: string): number | null {
  const cleaned = value.replace(",", ".").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatKm(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 0 }).format(value);
}

function eventSummary(ev: TravelOrderEvent): string {
  switch (ev.type) {
    case "BORDER":
      return [ev.countryFrom, ev.countryTo].filter(Boolean).join(" → ") || ev.location || "Granica";
    case "LOAD":
    case "UNLOAD":
      return ev.location || "-";
    case "FUEL": {
      const parts: string[] = [];
      if (ev.fuelLiters != null) parts.push(`${ev.fuelLiters} L`);
      if (ev.fuelAmount != null) parts.push(`${ev.fuelAmount} ${ev.currency ?? ""}`.trim());
      return parts.join(" · ") || ev.location || "Gorivo";
    }
    case "ODOMETER":
      return ev.odometer != null ? `${formatKm(ev.odometer)} km` : "-";
    default:
      return ev.note || ev.location || "-";
  }
}

type EventDraft = {
  type: TravelEventType;
  at: Date;
  countryFrom: string | null;
  countryTo: string | null;
  locationId: string | null;
  locationLabel: string | null;
  location: string;
  fuelLiters: string;
  fuelAmount: string;
  currency: string;
  odometer: string;
  note: string;
};

function emptyEventDraft(type: TravelEventType): EventDraft {
  return {
    type,
    at: new Date(),
    countryFrom: null,
    countryTo: null,
    locationId: null,
    locationLabel: null,
    location: "",
    fuelLiters: "",
    fuelAmount: "",
    currency: "EUR",
    odometer: "",
    note: ""
  };
}

type PickerMode = "countryFrom" | "countryTo" | "location";

export default function PutniNalogScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const respondEdit = useRespondLineEditRequest();
  const myDriverId = useMyDriverId();
  const switchDriver = useSwitchTravelOrderDriver();
  const toursQuery = useTours();
  const { data: orders = [], isLoading, isError, error, refetch } = useTravelOrders();
  const countriesQuery = useCountries();
  const locationsQuery = useCompanyLocations();
  const addEvent = useAddTravelEvent();
  const returnOrder = useReturnTravelOrder();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [eventModal, setEventModal] = useState<{ orderId: string } | null>(null);
  const [draft, setDraft] = useState<EventDraft>(emptyEventDraft("NOTE"));
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  const [returnModal, setReturnModal] = useState<{ orderId: string } | null>(null);
  const [returnOdo, setReturnOdo] = useState("");
  const [returnNote, setReturnNote] = useState("");

  const activeOrders = useMemo(
    () => [...orders].sort((a, b) => (b.dateFrom ?? "").localeCompare(a.dateFrom ?? "")),
    [orders]
  );

  function openEvent(orderId: string, type: TravelEventType) {
    setDraft(emptyEventDraft(type));
    setShowDate(false);
    setShowTime(false);
    setEventModal({ orderId });
  }

  function needsOdometer(type: TravelEventType) {
    return type !== "REST" && type !== "NOTE";
  }

  function respondToEditRequest(orderId: string, action: "ACCEPT" | "DECLINE") {
    respondEdit.mutate(
      { orderId, action },
      {
        onSuccess: () =>
          Alert.alert(
            "Putni list",
            action === "ACCEPT"
              ? "Prihvatio si izmenu. Tvoj original je sačuvan, dispečer sada uređuje list."
              : "Odbio si izmenu. Putni list ostaje tvoj."
          ),
        onError: (err) => Alert.alert("Putni list", err instanceof Error ? err.message : "Slanje odgovora nije uspelo.")
      }
    );
  }

  function onSaveEvent() {
    if (!eventModal) return;
    const t = draft.type;

    if (t === "BORDER" && (!draft.countryFrom || !draft.countryTo)) {
      Alert.alert("Putni nalog", "Izaberi zemlju iz koje izlaziš i u koju ulaziš.");
      return;
    }
    if ((t === "LOAD" || t === "UNLOAD") && !draft.locationId) {
      Alert.alert("Putni nalog", "Za utovar/istovar izaberi registrovanu lokaciju firme.");
      return;
    }
    if (t === "FUEL" && (parseNum(draft.fuelLiters) == null || parseNum(draft.fuelAmount) == null)) {
      Alert.alert("Putni nalog", "Unesi litre i iznos za gorivo.");
      return;
    }
    if (t === "ODOMETER" && parseNum(draft.odometer) == null) {
      Alert.alert("Putni nalog", "Unesi stanje kilometraže.");
      return;
    }
    if (t === "NOTE" && !draft.note.trim()) {
      Alert.alert("Putni nalog", "Unesi tekst beleške.");
      return;
    }

    addEvent.mutate(
      {
        orderId: eventModal.orderId,
        data: {
          type: t,
          at: draft.at.toISOString(),
          countryFrom: t === "BORDER" ? draft.countryFrom : null,
          countryTo: t === "BORDER" ? draft.countryTo : null,
          locationId: t === "LOAD" || t === "UNLOAD" ? draft.locationId : null,
          location: t === "LOAD" || t === "UNLOAD" ? null : draft.location.trim() || null,
          fuelLiters: t === "FUEL" ? parseNum(draft.fuelLiters) : null,
          fuelAmount: t === "FUEL" ? parseNum(draft.fuelAmount) : null,
          currency: t === "FUEL" ? draft.currency : null,
          odometer: needsOdometer(t) ? parseNum(draft.odometer) : null,
          note: draft.note.trim() || null
        }
      },
      {
        onSuccess: () => setEventModal(null),
        onError: (err) => Alert.alert("Putni nalog", err instanceof Error ? err.message : "Čuvanje nije uspelo.")
      }
    );
  }

  function openReturn(orderId: string) {
    setReturnOdo("");
    setReturnNote("");
    setReturnModal({ orderId });
  }

  function onConfirmReturn() {
    if (!returnModal) return;
    Alert.alert("Vrati nalog", "Da li si siguran da vraćaš ovaj putni nalog?", [
      { text: "Odustani", style: "cancel" },
      {
        text: "Vrati",
        onPress: () =>
          returnOrder.mutate(
            { orderId: returnModal.orderId, data: { odoEnd: parseNum(returnOdo), note: returnNote } },
            {
              onSuccess: () => setReturnModal(null),
              onError: (err) => Alert.alert("Putni nalog", err instanceof Error ? err.message : "Vraćanje nije uspelo.")
            }
          )
      }
    ]);
  }

  const pickerItems = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (pickerMode === "location") {
      const list = locationsQuery.data ?? [];
      return list
        .map((l) => ({
          id: l.id,
          label: [l.name, l.address].filter(Boolean).join(" · ") || l.city || "Lokacija",
          subtitle: [l.city, l.country].filter(Boolean).join(", ")
        }))
        .filter((i) => !q || i.label.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q));
    }
    const list = countriesQuery.data ?? [];
    return list
      .map((c) => ({ id: c.name, label: c.name, subtitle: c.code ?? "" }))
      .filter((i) => !q || i.label.toLowerCase().includes(q));
  }, [pickerMode, pickerSearch, countriesQuery.data, locationsQuery.data]);

  function onPickItem(item: { id: string; label: string }) {
    if (pickerMode === "countryFrom") setDraft((d) => ({ ...d, countryFrom: item.label }));
    else if (pickerMode === "countryTo") setDraft((d) => ({ ...d, countryTo: item.label }));
    else if (pickerMode === "location") setDraft((d) => ({ ...d, locationId: item.id, locationLabel: item.label }));
    setPickerMode(null);
    setPickerSearch("");
  }

  const isSaving = addEvent.isPending;

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.surface.app }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 14, paddingBottom: 40 }}
    >
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <View>
        <Text style={{ color: theme.text.primary, fontSize: 26, fontWeight: "800" }}>Putni nalog</Text>
        <Text className="mt-0.5 text-sm" style={{ color: theme.text.secondary }}>
          Beleži događaje sa puta i vrati nalog kad završiš.
        </Text>
      </View>

      {isLoading ? <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 24 }} /> : null}
      {isError ? (
        <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
          <Text className="font-semibold text-red-700 dark:text-red-300">Greška pri učitavanju naloga</Text>
          <Text className="mt-1 text-xs text-red-600 dark:text-red-400">
            {error instanceof Error ? error.message : "Nepoznata greška."}
          </Text>
          <Pressable onPress={() => refetch()} className="mt-2 self-start rounded-lg border px-3 py-1.5" style={{ borderColor: theme.surface.border }}>
            <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>Pokušaj ponovo</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !activeOrders.length && !isError ? (
        <View className="mt-4 rounded-2xl border border-dashed p-4" style={{ borderColor: theme.surface.border }}>
          <Text className="text-sm" style={{ color: theme.text.secondary }}>
            Nemaš aktivnih putnih naloga. Dispečer ti dodeljuje nalog na webu.
          </Text>
        </View>
      ) : null}

      <View className="mt-4 gap-3">
        {activeOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            theme={theme}
            expanded={expandedId === order.id}
            onToggle={() => setExpandedId((id) => (id === order.id ? null : order.id))}
            onEvent={(type) => openEvent(order.id, type)}
            onReturn={() => openReturn(order.id)}
            onOpenLines={() => router.push(`/putni-list/${order.id}`)}
            onRespondEdit={(action) => respondToEditRequest(order.id, action)}
            respondingEdit={respondEdit.isPending}
            myDriverId={myDriverId}
            tour={toursQuery.data?.find((t) => t.id === order.tourId) ?? null}
            switching={switchDriver.isPending}
            onSwitchDriver={() => {
              switchDriver.mutate(order.id, {
                onSuccess: (res) =>
                  Alert.alert(
                    "Smena vožnje",
                    res.data?.isMeActive
                      ? "Sada si ti za volanom — unos je otvoren."
                      : "Smena je preneta na drugog vozača."
                  ),
                onError: (err) =>
                  Alert.alert("Smena vožnje", err instanceof Error ? err.message : "Smena nije uspela.")
              });
            }}
            returning={returnOrder.isPending}
          />
        ))}
      </View>

      {/* Event modal */}
      <Modal visible={Boolean(eventModal)} transparent animationType="slide" onRequestClose={() => setEventModal(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <ScrollView
            className="max-h-[92%] rounded-t-3xl px-4 pt-5"
            style={{ backgroundColor: theme.surface.card }}
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name={eventMeta(draft.type).icon} size={22} color={theme.accent.primary} />
              <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                {eventMeta(draft.type).label}
              </Text>
            </View>

            {/* Vreme */}
            <Text className="mt-4 text-xs" style={{ color: theme.text.secondary }}>Vreme događaja</Text>
            <View className="mt-1 flex-row gap-2">
              <Pressable
                onPress={() => setShowDate(true)}
                className="flex-1 flex-row items-center justify-between rounded-xl border px-4 py-3"
                style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.app }}
              >
                <Text style={{ color: theme.text.primary }}>{formatDateTime(draft.at.toISOString()).split(" ")[0]}</Text>
                <Ionicons name="calendar-outline" size={18} color={theme.text.muted} />
              </Pressable>
              <Pressable
                onPress={() => setShowTime(true)}
                className="flex-1 flex-row items-center justify-between rounded-xl border px-4 py-3"
                style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.app }}
              >
                <Text style={{ color: theme.text.primary }}>
                  {String(draft.at.getHours()).padStart(2, "0")}:{String(draft.at.getMinutes()).padStart(2, "0")}
                </Text>
                <Ionicons name="time-outline" size={18} color={theme.text.muted} />
              </Pressable>
            </View>
            {showDate && (
              <DateTimePicker
                value={draft.at}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(_, selected) => {
                  if (Platform.OS !== "ios") setShowDate(false);
                  if (selected)
                    setDraft((d) => {
                      const next = new Date(d.at);
                      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                      return { ...d, at: next };
                    });
                }}
              />
            )}
            {showTime && (
              <DateTimePicker
                value={draft.at}
                mode="time"
                is24Hour
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, selected) => {
                  if (Platform.OS !== "ios") setShowTime(false);
                  if (selected)
                    setDraft((d) => {
                      const next = new Date(d.at);
                      next.setHours(selected.getHours(), selected.getMinutes());
                      return { ...d, at: next };
                    });
                }}
              />
            )}

            {/* Type-specific fields */}
            {draft.type === "BORDER" ? (
              <>
                <FieldLabel theme={theme}>Iz zemlje</FieldLabel>
                <PickerButton theme={theme} value={draft.countryFrom} placeholder="Izaberi zemlju" onPress={() => setPickerMode("countryFrom")} />
                <FieldLabel theme={theme}>U zemlju</FieldLabel>
                <PickerButton theme={theme} value={draft.countryTo} placeholder="Izaberi zemlju" onPress={() => setPickerMode("countryTo")} />
              </>
            ) : null}

            {draft.type === "LOAD" || draft.type === "UNLOAD" ? (
              <>
                <FieldLabel theme={theme}>Lokacija (iz kataloga firme)</FieldLabel>
                <PickerButton theme={theme} value={draft.locationLabel} placeholder="Izaberi lokaciju" onPress={() => setPickerMode("location")} />
                {locationsQuery.isError ? (
                  <Text className="mt-1 text-xs text-red-600">Ne mogu da učitam lokacije.</Text>
                ) : null}
              </>
            ) : null}

            {draft.type === "FUEL" ? (
              <>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <FieldLabel theme={theme}>Litri</FieldLabel>
                    <NumInput theme={theme} value={draft.fuelLiters} onChangeText={(v) => setDraft((d) => ({ ...d, fuelLiters: v }))} placeholder="0" />
                  </View>
                  <View className="flex-1">
                    <FieldLabel theme={theme}>Iznos</FieldLabel>
                    <NumInput theme={theme} value={draft.fuelAmount} onChangeText={(v) => setDraft((d) => ({ ...d, fuelAmount: v }))} placeholder="0" />
                  </View>
                </View>
                <FieldLabel theme={theme}>Valuta</FieldLabel>
                <View className="mt-1 flex-row gap-2">
                  {CURRENCIES.map((c) => {
                    const active = draft.currency === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => setDraft((d) => ({ ...d, currency: c }))}
                        className="flex-1 rounded-lg border px-2 py-2"
                        style={{ borderColor: active ? theme.accent.primary : theme.surface.border, backgroundColor: active ? theme.accent.primaryLight : theme.surface.app }}
                      >
                        <Text className="text-center text-xs font-semibold" style={{ color: active ? theme.accent.primaryDark : theme.text.secondary }}>{c}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {needsOdometer(draft.type) ? (
              <>
                <FieldLabel theme={theme}>
                  {draft.type === "ODOMETER" ? "Kilometraža (km)" : "Kilometraža (opciono)"}
                </FieldLabel>
                <NumInput theme={theme} value={draft.odometer} onChangeText={(v) => setDraft((d) => ({ ...d, odometer: v }))} placeholder="npr. 123900" />
              </>
            ) : null}

            {draft.type === "FUEL" || draft.type === "REST" || draft.type === "HANDOVER" ? (
              <>
                <FieldLabel theme={theme}>Mesto (opciono)</FieldLabel>
                <TextInput
                  value={draft.location}
                  onChangeText={(location) => setDraft((d) => ({ ...d, location }))}
                  placeholder="npr. OMV Niš"
                  placeholderTextColor={theme.text.muted}
                  className="mt-1 rounded-xl border px-4 py-3"
                  style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.app, color: theme.text.primary }}
                />
              </>
            ) : null}

            <FieldLabel theme={theme}>{draft.type === "NOTE" ? "Beleška" : "Napomena (opciono)"}</FieldLabel>
            <TextInput
              value={draft.note}
              onChangeText={(note) => setDraft((d) => ({ ...d, note }))}
              placeholder={draft.type === "HANDOVER" ? "npr. preuzima Petar Petrović" : "Detalji"}
              placeholderTextColor={theme.text.muted}
              multiline
              className="mt-1 rounded-xl border px-4 py-3"
              style={{ minHeight: 70, textAlignVertical: "top", borderColor: theme.surface.border, backgroundColor: theme.surface.app, color: theme.text.primary }}
            />

            <View className="mt-5 flex-row gap-2">
              <Pressable className="flex-1 rounded-xl border px-4 py-3" style={{ borderColor: theme.surface.border }} onPress={() => setEventModal(null)}>
                <Text className="text-center font-semibold" style={{ color: theme.text.secondary }}>Odustani</Text>
              </Pressable>
              <Pressable className="flex-1 rounded-xl px-4 py-3 disabled:opacity-60" style={{ backgroundColor: theme.accent.primary }} onPress={onSaveEvent} disabled={isSaving}>
                <Text className="text-center font-semibold text-white">{isSaving ? "Čuvanje..." : "Sačuvaj"}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Picker modal (countries / locations) */}
      <Modal visible={Boolean(pickerMode)} transparent animationType="slide" onRequestClose={() => setPickerMode(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[85%] rounded-t-3xl px-4 pt-5" style={{ backgroundColor: theme.surface.card }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                {pickerMode === "location" ? "Izaberi lokaciju" : "Izaberi zemlju"}
              </Text>
              <Pressable onPress={() => setPickerMode(null)}>
                <Ionicons name="close" size={24} color={theme.text.muted} />
              </Pressable>
            </View>
            <TextInput
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder="Pretraga"
              placeholderTextColor={theme.text.muted}
              className="mt-3 rounded-xl border px-4 py-3"
              style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.app, color: theme.text.primary }}
            />
            {(pickerMode === "location" ? locationsQuery.isLoading : countriesQuery.isLoading) ? (
              <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 20 }} />
            ) : null}
            <ScrollView className="mt-2" style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
              {pickerItems.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => onPickItem(item)}
                  className="border-b py-3"
                  style={{ borderColor: theme.surface.border }}
                >
                  <Text className="text-base" style={{ color: theme.text.primary }}>{item.label}</Text>
                  {item.subtitle ? <Text className="text-xs" style={{ color: theme.text.muted }}>{item.subtitle}</Text> : null}
                </Pressable>
              ))}
              {!pickerItems.length ? (
                <Text className="py-6 text-center text-sm" style={{ color: theme.text.muted }}>Nema rezultata.</Text>
              ) : null}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Return modal */}
      <Modal visible={Boolean(returnModal)} transparent animationType="slide" onRequestClose={() => setReturnModal(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl px-4 pt-5" style={{ backgroundColor: theme.surface.card, paddingBottom: 32 }}>
            <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>Vrati nalog</Text>
            <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>
              Nalog ide dispečeru na zatvaranje. Ti ga ne zatvaraš.
            </Text>

            <FieldLabel theme={theme}>Završna kilometraža (opciono)</FieldLabel>
            <NumInput theme={theme} value={returnOdo} onChangeText={setReturnOdo} placeholder="npr. 125300" />

            <FieldLabel theme={theme}>Napomena (opciono)</FieldLabel>
            <TextInput
              value={returnNote}
              onChangeText={setReturnNote}
              placeholder="npr. Vraćen nalog, sve OK"
              placeholderTextColor={theme.text.muted}
              multiline
              className="mt-1 rounded-xl border px-4 py-3"
              style={{ minHeight: 70, textAlignVertical: "top", borderColor: theme.surface.border, backgroundColor: theme.surface.app, color: theme.text.primary }}
            />

            <View className="mt-5 flex-row gap-2">
              <Pressable className="flex-1 rounded-xl border px-4 py-3" style={{ borderColor: theme.surface.border }} onPress={() => setReturnModal(null)}>
                <Text className="text-center font-semibold" style={{ color: theme.text.secondary }}>Odustani</Text>
              </Pressable>
              <Pressable className="flex-1 rounded-xl px-4 py-3 disabled:opacity-60" style={{ backgroundColor: theme.accent.primary }} onPress={onConfirmReturn} disabled={returnOrder.isPending}>
                <Text className="text-center font-semibold text-white">{returnOrder.isPending ? "Slanje..." : "Vrati nalog"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function FieldLabel({ theme, children }: { theme: AppTheme; children: ReactNode }) {
  return <Text className="mt-4 text-xs" style={{ color: theme.text.secondary }}>{children}</Text>;
}

function NumInput({ theme, value, onChangeText, placeholder }: { theme: AppTheme; value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType="numeric"
      placeholder={placeholder}
      placeholderTextColor={theme.text.muted}
      className="mt-1 rounded-xl border px-4 py-3"
      style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.app, color: theme.text.primary }}
    />
  );
}

function PickerButton({ theme, value, placeholder, onPress }: { theme: AppTheme; value: string | null; placeholder: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mt-1 flex-row items-center justify-between rounded-xl border px-4 py-3"
      style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.app }}
    >
      <Text style={{ color: value ? theme.text.primary : theme.text.muted }}>{value || placeholder}</Text>
      <Ionicons name="chevron-down" size={18} color={theme.text.muted} />
    </Pressable>
  );
}

function OrderCard({
  order,
  theme,
  expanded,
  onToggle,
  onEvent,
  onReturn,
  onOpenLines,
  onRespondEdit,
  respondingEdit,
  myDriverId,
  tour,
  switching,
  onSwitchDriver,
  returning
}: {
  order: TravelOrder;
  theme: AppTheme;
  expanded: boolean;
  onToggle: () => void;
  onEvent: (type: TravelEventType) => void;
  onReturn: () => void;
  onOpenLines: () => void;
  onRespondEdit: (action: "ACCEPT" | "DECLINE") => void;
  respondingEdit: boolean;
  myDriverId: string | null;
  tour: Tour | null;
  switching: boolean;
  onSwitchDriver: () => void;
  returning: boolean;
}) {
  const status = statusMeta(theme, order.status);
  const purposeLabel = travelOrderPurposeLabel(order.purpose);
  // Backend jos ne popunjava TravelOrder.coDriverId kad nalog nastane za turu
  // sa dvojnom posadom, pa padamo nazad na turu — isto kako njihov /lines
  // racuna readOnly ("po TravelOrder.coDriverId ILI Tour.coDriverId ture").
  const crewSource = order.coDriverId ? order : tour ?? order;
  const crew = crewRole(crewSource, myDriverId);
  const crewReadOnly = !canWriteAsCrew(crewSource, myDriverId);
  const hasCrew = canSwitchDriver(crewSource);
  // Smena ide na POST /travel-orders/:id/switch-driver (backend 2026-10-24),
  // pa nalog ne mora da bude vezan za turu.
  const showSwitch = hasCrew;
  const linesQuery = useTravelOrderLines(expanded ? order.id : null);
  const lineCount = Array.isArray(linesQuery.data?.lines) ? linesQuery.data.lines.length : 0;
  const canEdit = order.status === "OPEN" || order.status === "ON_ROAD";
  const events = order.events ?? [];

  return (
    <View className="rounded-2xl border" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
      <Pressable onPress={onToggle} className="p-4">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <Text className="text-base font-extrabold" style={{ color: theme.text.primary }} numberOfLines={1}>
              {order.number ?? "Putni nalog"}
            </Text>
            {order.route ? (
              <Text className="mt-0.5 text-sm" style={{ color: theme.text.secondary }} numberOfLines={1}>{order.route}</Text>
            ) : null}
            {purposeLabel ? (
              <View className="mt-1.5 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: theme.surface.subtle }}>
                <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>{purposeLabel}</Text>
              </View>
            ) : null}
          </View>
          <View className="items-end gap-1">
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: status.bg }}>
              <Text className="text-xs font-semibold" style={{ color: status.text }}>{status.label}</Text>
            </View>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.text.muted} />
          </View>
        </View>
        <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
          <Text className="text-xs" style={{ color: theme.text.muted }}>Polazak: {formatDateTime(order.dateFrom)}</Text>
          <Text className="text-xs" style={{ color: theme.text.muted }}>Početna km: {formatKm(order.odoStart)}</Text>
          {events.length ? (
            <Text className="text-xs" style={{ color: theme.text.muted }}>Događaja: {events.length}</Text>
          ) : null}
        </View>
      </Pressable>

      {expanded ? (
        <View className="px-4 pb-4">
          {order.lineEditStatus === "REQUESTED" ? (
            <View className="mb-3 rounded-xl border p-3" style={{ borderColor: theme.status.IN_TRANSIT.text, backgroundColor: theme.status.IN_TRANSIT.bg }}>
              <Text className="text-sm font-semibold" style={{ color: theme.status.IN_TRANSIT.text }}>
                Dispečer traži izmenu putnog lista
              </Text>
              <Text className="mt-1 text-xs" style={{ color: theme.status.IN_TRANSIT.text }}>
                Ako prihvatiš, tvoj original ostaje sačuvan i videćeš obe verzije.
              </Text>
              <View className="mt-2.5 flex-row gap-2">
                <Pressable
                  onPress={() => onRespondEdit("DECLINE")}
                  disabled={respondingEdit}
                  className="flex-1 rounded-xl border px-3 py-2 disabled:opacity-60"
                  style={{ borderColor: theme.status.IN_TRANSIT.text }}
                >
                  <Text className="text-center text-xs font-semibold" style={{ color: theme.status.IN_TRANSIT.text }}>Odbij</Text>
                </Pressable>
                <Pressable
                  onPress={() => onRespondEdit("ACCEPT")}
                  disabled={respondingEdit}
                  className="flex-1 rounded-xl px-3 py-2 disabled:opacity-60"
                  style={{ backgroundColor: theme.accent.primary }}
                >
                  <Text className="text-center text-xs font-semibold text-white">Prihvati</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {crewReadOnly ? (
            <View className="mb-3 rounded-xl border px-3 py-2.5" style={{ borderColor: theme.status.IN_TRANSIT.text, backgroundColor: theme.status.IN_TRANSIT.bg }}>
              <Text className="text-xs font-semibold" style={{ color: theme.status.IN_TRANSIT.text }}>
                {crewBadgeLabel(crew) ?? "Dvojna posada"}
                {crewSource.coDriverName ? ` · ${crewSource.coDriverName}` : ""} — pregled
              </Text>
              <Text className="mt-1 text-xs" style={{ color: theme.status.IN_TRANSIT.text }}>
                Nalog vodi vozač koji je trenutno na smeni.
              </Text>
            </View>
          ) : hasCrew ? (
            <View className="mb-3 flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: theme.surface.subtle }}>
              <Ionicons name="people-outline" size={14} color={theme.text.secondary} />
              <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                Dvojna posada{crewSource.coDriverName ? ` · ${crewSource.coDriverName}` : ""} — ti si na smeni
              </Text>
            </View>
          ) : null}

          {showSwitch ? (
            <Pressable
              onPress={onSwitchDriver}
              disabled={switching}
              className="mb-3 rounded-xl border px-4 py-2.5 disabled:opacity-60"
              style={{ borderColor: theme.accent.primary }}
            >
              <Text className="text-center text-sm font-semibold" style={{ color: theme.accent.primary }}>
                {switching ? "Menjam..." : "Smena vožnje"}
              </Text>
            </Pressable>
          ) : null}

          {/* Quick add buttons */}
          {canEdit && !crewReadOnly ? (
            <View className="flex-row flex-wrap gap-2">
              {QUICK_EVENT_TYPES.map((et) => (
                <Pressable
                  key={et.value}
                  onPress={() => onEvent(et.value)}
                  className="flex-row items-center gap-1.5 rounded-xl border px-3 py-2"
                  style={{ borderColor: theme.accent.primary, backgroundColor: theme.accent.primaryLight }}
                >
                  <Ionicons name={et.icon} size={16} color={theme.accent.primaryDark} />
                  <Text className="text-xs font-bold" style={{ color: theme.accent.primaryDark }}>{et.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : canEdit ? null : (
            // Samo kad je nalog stvarno zatvoren. Kad je zakljucan zbog smene,
            // banner iznad vec objasnjava zasto — ova poruka bi bila netacna.
            <Text className="text-sm" style={{ color: theme.text.secondary }}>
              Nalog je {status.label.toLowerCase()} — više se ne menja.
            </Text>
          )}

          {/* Kretanje: redovi putnog lista, pa hronoloski dogadjaji */}
          <Text className="mt-4 mb-1 text-[11px] font-bold uppercase" style={{ color: theme.text.muted }}>Kretanje</Text>

          <Pressable
            onPress={onOpenLines}
            className="mb-2 flex-row items-center justify-between gap-2 rounded-xl border px-4 py-2.5"
            style={{ borderColor: theme.surface.border }}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="grid-outline" size={16} color={theme.text.secondary} />
              <Text className="text-sm font-semibold" style={{ color: theme.text.secondary }}>Putni list</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-xs" style={{ color: theme.text.muted }}>{rowCountLabel(lineCount)}</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.text.muted} />
            </View>
          </Pressable>

          {events.length ? (
            <View className="gap-2">
              {events.map((ev) => {
                const meta = eventMeta(ev.type);
                return (
                  <View key={ev.id} className="flex-row items-start gap-3 rounded-xl border p-3" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.subtle }}>
                    <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: theme.accent.primaryLight }}>
                      <Ionicons name={meta.icon} size={16} color={theme.accent.primary} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between gap-2">
                        <Text className="text-sm font-bold" style={{ color: theme.text.primary }}>{meta.label}</Text>
                        <Text className="text-[11px]" style={{ color: theme.text.muted }}>{formatDateTime(ev.at)}</Text>
                      </View>
                      <Text className="mt-0.5 text-sm" style={{ color: theme.text.secondary }}>{eventSummary(ev)}</Text>
                      {ev.note ? <Text className="mt-0.5 text-xs" style={{ color: theme.text.muted }}>{ev.note}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : lineCount ? null : (
            <Text className="text-sm" style={{ color: theme.text.muted }}>Još nije popunjeno.</Text>
          )}

          {/* Return */}
          {canEdit && !crewReadOnly ? (
            <Pressable
              onPress={onReturn}
              disabled={returning}
              className="mt-4 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3 disabled:opacity-60"
              style={{ backgroundColor: theme.accent.primary }}
            >
              <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
              <Text className="font-semibold text-white">Vrati nalog</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
