import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Alert, Image, Modal, Platform, ScrollView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import { useTourDetails } from "@/queries/useTourDetails";
import {
  useConfirmExpenseSheet,
  useCreateExpenseItem,
  useCreateExpenseSheet,
  useDeleteExpenseItem,
  useExpenseSheet,
  useUpdateExpenseItem,
  useUpdateExpenseSheet
} from "@/queries/useExpenseSheet";
import type { ExpenseItem } from "@/lib/types";
import { formatDate, formatRouteLabel, translateExpenseStatus } from "@/lib/formatters";
import { uploadFromFileUri } from "@/services/upload";

type Currency = "EUR" | "RSD";
type PaymentType = "CASH" | "CARD";

const CATEGORY_OPTIONS = ["Gorivo", "Putarina", "Carina", "Špedicija", "Smeštaj", "Dnevnica", "Ostalo"] as const;
const CURRENCY_OPTIONS: Currency[] = ["EUR", "RSD"];
const COUNTRY_OPTIONS = [
  { code: "RS", label: "Srbija", flag: "🇷🇸" },
  { code: "HR", label: "Hrvatska", flag: "🇭🇷" },
  { code: "AT", label: "Austrija", flag: "🇦🇹" },
  { code: "DE", label: "Nemačka", flag: "🇩🇪" },
  { code: "SI", label: "Slovenija", flag: "🇸🇮" },
  { code: "HU", label: "Mađarska", flag: "🇭🇺" },
  { code: "IT", label: "Italija", flag: "🇮🇹" },
  { code: "FR", label: "Francuska", flag: "🇫🇷" },
  { code: "BA", label: "Bosna i Hercegovina", flag: "🇧🇦" },
  { code: "ME", label: "Crna Gora", flag: "🇲🇪" }
] as const;
type ItemDraft = {
  country: string;
  category: string;
  paymentType: PaymentType;
  amount: string;
  currency: Currency;
  date: string;
  note: string;
  receiptUrl: string;
};

type ImagePickerAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type ImagePickerResult = {
  canceled: boolean;
  assets?: ImagePickerAsset[];
};

type ImagePickerModule = {
  MediaTypeOptions: { Images: string };
  requestCameraPermissionsAsync: () => Promise<{ granted: boolean }>;
  requestMediaLibraryPermissionsAsync: () => Promise<{ granted: boolean }>;
  launchCameraAsync: (options: Record<string, unknown>) => Promise<ImagePickerResult>;
  launchImageLibraryAsync: (options: Record<string, unknown>) => Promise<ImagePickerResult>;
};

function getImagePicker(): ImagePickerModule | null {
  try {
    const req = (globalThis as { require?: (module: string) => unknown }).require;
    if (!req) return null;
    return req("expo-image-picker") as ImagePickerModule;
  } catch {
    return null;
  }
}

function parseAmount(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatTotals(values: Record<string, number>): string {
  const entries = Object.entries(values).filter(([, value]) => Math.abs(value) > 0.0001);
  if (!entries.length) return "0";
  return entries.map(([currency, value]) => `${value.toFixed(2)} ${currency}`).join(" + ");
}

function getCountryMeta(code: string): { label: string; flag: string } {
  const found = COUNTRY_OPTIONS.find((country) => country.code === code);
  return found ? { label: found.label, flag: found.flag } : { label: code, flag: "" };
}

function statusBadgeClass(status: string): string {
  if (status === "OPEN") return "bg-green-100 text-green-700";
  if (status === "SUBMITTED") return "bg-blue-100 text-blue-700";
  if (status === "REVISED") return "bg-amber-100 text-amber-700";
  if (status === "CONFIRMED" || status === "APPROVED") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-200 text-slate-700";
}

function createDefaultDraft(): ItemDraft {
  return {
    country: "RS",
    category: "Gorivo",
    paymentType: "CARD",
    amount: "",
    currency: "EUR",
    date: new Date().toISOString(),
    note: "",
    receiptUrl: ""
  };
}

export default function TourExpenseScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const tourId = params.id;
  const { data: tour } = useTourDetails(tourId);

  const { data: sheet, isLoading, isError } = useExpenseSheet(tourId);
  const createSheet = useCreateExpenseSheet(tourId);
  const updateSheet = useUpdateExpenseSheet(sheet?.id, tourId);
  const createItem = useCreateExpenseItem(sheet?.id, tourId);
  const updateItem = useUpdateExpenseItem(sheet?.id, tourId);
  const deleteItem = useDeleteExpenseItem(sheet?.id, tourId);
  const confirmSheet = useConfirmExpenseSheet(tourId);

  const [isCreateSheetModalVisible, setCreateSheetModalVisible] = useState(false);
  const [isAdvanceModalVisible, setAdvanceModalVisible] = useState(false);
  const [isItemModalVisible, setItemModalVisible] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  const [advance, setAdvance] = useState("500");
  const [advanceCurrency, setAdvanceCurrency] = useState<Currency>("EUR");
  const [sheetNotes, setSheetNotes] = useState("");

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(createDefaultDraft());
  const [isUploadingReceipt, setUploadingReceipt] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isReadOnly = sheet ? sheet.status !== "OPEN" : false;
  const isItemMutationPending = createItem.isPending || updateItem.isPending || deleteItem.isPending;
  const normalizedItems = useMemo(() => {
    const source = sheet?.items ?? [];
    const uniqueById = new Map<string, ExpenseItem>();
    for (const item of source) {
      uniqueById.set(item.id, item);
    }

    // Keep newest row per logical key to avoid visual duplicates from optimistic/offline merges.
    const uniqueLogical = new Map<string, ExpenseItem>();
    for (const item of uniqueById.values()) {
      const normalizedDate =
        typeof item.date === "string" && item.date.length >= 10 ? item.date.slice(0, 10) : String(item.date ?? "");
      const cash = item.cashAmount == null ? "" : Number(item.cashAmount).toFixed(2);
      const card = item.cardAmount == null ? "" : Number(item.cardAmount).toFixed(2);
      const logicalKey = [item.country ?? "", item.sequence ?? "", item.category ?? "", item.currency ?? "", cash, card, normalizedDate].join("|");

      const existing = uniqueLogical.get(logicalKey);
      if (!existing || item.id > existing.id) {
        uniqueLogical.set(logicalKey, item);
      }
    }

    return Array.from(uniqueLogical.values());
  }, [sheet?.items]);

  const maxSequence = useMemo(() => {
    const items = normalizedItems;
    if (!items.length) return 0;
    return Math.max(...items.map((item) => item.sequence || 0));
  }, [normalizedItems]);

  const groupedItems = useMemo(() => {
    const map = new Map<string, ExpenseItem[]>();
    for (const item of normalizedItems) {
      const key = item.country || "N/A";
      const next = map.get(key) ?? [];
      next.push(item);
      map.set(key, next);
    }
    return Array.from(map.entries())
      .map(([country, items]) => [country, [...items].sort((a, b) => a.sequence - b.sequence)] as const)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [normalizedItems]);

  const totals = useMemo(() => {
    const cashTotals: Record<string, number> = {};
    const cardTotals: Record<string, number> = {};
    for (const item of normalizedItems) {
      const currency = item.currency || "EUR";
      if (item.cashAmount != null) {
        cashTotals[currency] = (cashTotals[currency] ?? 0) + item.cashAmount;
      }
      if (item.cardAmount != null) {
        cardTotals[currency] = (cardTotals[currency] ?? 0) + item.cardAmount;
      }
    }
    const currentAdvanceCurrency = (sheet?.advanceCurrency ?? "EUR") as Currency;
    const advanceValue = sheet?.advance ?? 0;
    const spentFromAdvance = cashTotals[currentAdvanceCurrency] ?? 0;
    const remainingAdvance = advanceValue - spentFromAdvance;
    return { cashTotals, cardTotals, currentAdvanceCurrency, advanceValue, remainingAdvance };
  }, [normalizedItems, sheet?.advance, sheet?.advanceCurrency]);

  const safeAdvanceValue =
    typeof sheet?.advance === "number"
      ? sheet.advance
      : Number.isFinite(Number(sheet?.advance))
      ? Number(sheet?.advance)
      : 0;

  function resetItemDraft() {
    setEditingItemId(null);
    setItemDraft(createDefaultDraft());
    setShowDatePicker(false);
  }

  function onOpenCreateItem() {
    if (isReadOnly) return;
    resetItemDraft();
    setItemModalVisible(true);
  }

  function onCreateSheet() {
    const parsedAdvance = parseAmount(advance);
    createSheet.mutate(
      {
        advance: parsedAdvance,
        advanceCurrency,
        notes: sheetNotes.trim() || null
      },
      {
        onSuccess: () => {
          setCreateSheetModalVisible(false);
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Neuspešno kreiranje troškovnika.";
          Alert.alert("Troškovnik", message);
        }
      }
    );
  }

  function onSaveAdvance() {
    if (!sheet || isReadOnly) return;
    const parsedAdvance = parseAmount(advance);
    updateSheet.mutate(
      {
        advance: parsedAdvance,
        advanceCurrency,
        notes: sheetNotes.trim() || null
      },
      {
        onSuccess: () => {
          setAdvanceModalVisible(false);
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Neuspešna izmena akontacije.";
          Alert.alert("Troškovnik", message);
        }
      }
    );
  }

  function onEditItem(item: ExpenseItem) {
    if (isReadOnly) return;
    setEditingItemId(item.id);
    setItemDraft({
      country: item.country || "RS",
      category: item.category || "Gorivo",
      paymentType: item.cashAmount != null && item.cashAmount > 0 ? "CASH" : "CARD",
      amount: (item.cashAmount ?? item.cardAmount ?? "").toString(),
      currency: (item.currency as Currency) || "EUR",
      date: item.date ?? new Date().toISOString(),
      note: item.note ?? "",
      receiptUrl: item.receiptUrl ?? ""
    });
    setItemModalVisible(true);
  }

  function onDeleteItem(itemId: string) {
    if (isReadOnly) return;
    Alert.alert("Brisanje stavke", "Da li ste sigurni da želite da obrišete stavku?", [
      { text: "Odustani", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: () => {
          deleteItem.mutate(itemId, {
            onError: (error) => {
              const message = error instanceof Error ? error.message : "Neuspešno brisanje stavke.";
              Alert.alert("Troškovnik", message);
            }
          });
        }
      }
    ]);
  }

  function onSaveItem() {
    if (!sheet || isReadOnly) return;
    const amount = parseAmount(itemDraft.amount);
    if (!amount || amount <= 0) {
      Alert.alert("Troškovnik", "Unesite validan iznos.");
      return;
    }

    const payload = {
      country: itemDraft.country,
      sequence: editingItemId
        ? (normalizedItems.find((item) => item.id === editingItemId)?.sequence ?? maxSequence + 1)
        : maxSequence + 1,
      category: itemDraft.category,
      date: itemDraft.date,
      note: itemDraft.note.trim() || null,
      cardAmount: itemDraft.paymentType === "CARD" ? amount : null,
      cashAmount: itemDraft.paymentType === "CASH" ? amount : null,
      currency: itemDraft.currency,
      receiptUrl: itemDraft.receiptUrl.trim() || null
    };

    if (!editingItemId) {
      createItem.mutate(payload, {
        onSuccess: () => {
          setItemModalVisible(false);
          resetItemDraft();
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Neuspešno dodavanje stavke.";
          Alert.alert("Troškovnik", message);
        }
      });
      return;
    }

    updateItem.mutate(
      { itemId: editingItemId, data: payload },
      {
        onSuccess: () => {
          setItemModalVisible(false);
          resetItemDraft();
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Neuspešna izmena stavke.";
          Alert.alert("Troškovnik", message);
        }
      }
    );
  }

  function onSubmitSheet() {
    if (!sheet || isReadOnly) return;
    Alert.alert("Predaja troškovnika", "Nakon predaje troškovnik postaje samo za čitanje. Nastaviti?", [
      { text: "Odustani", style: "cancel" },
      {
        text: "Predaj",
        onPress: () => {
          updateSheet.mutate(
            { status: "SUBMITTED" },
            {
              onError: (error) => {
                const message = error instanceof Error ? error.message : "Neuspešna predaja troškovnika.";
                Alert.alert("Troškovnik", message);
              }
            }
          );
        }
      }
    ]);
  }

  function onConfirmRevision() {
    if (!sheet || sheet.status !== "REVISED") return;
    Alert.alert("Potvrda izmene", "Potvrđuješ izmene koje je dispečer uneo u troškovnik?", [
      { text: "Odustani", style: "cancel" },
      {
        text: "Potvrdi",
        onPress: () => {
          confirmSheet.mutate(
            { action: "CONFIRM" },
            {
              onError: (error) => {
                const message = error instanceof Error ? error.message : "Neuspešna potvrda izmene.";
                Alert.alert("Troškovnik", message);
              }
            }
          );
        }
      }
    ]);
  }

  function onRejectRevision() {
    if (!sheet || sheet.status !== "REVISED") return;
    Alert.alert(
      "Vraćanje na doradu",
      "Vraćaš troškovnik na doradu? Ponovo ćeš moći da menjaš stavke i da ga pošalješ.",
      [
        { text: "Odustani", style: "cancel" },
        {
          text: "Vrati na doradu",
          style: "destructive",
          onPress: () => {
            confirmSheet.mutate(
              { action: "REJECT" },
              {
                onError: (error) => {
                  const message = error instanceof Error ? error.message : "Neuspešno vraćanje na doradu.";
                  Alert.alert("Troškovnik", message);
                }
              }
            );
          }
        }
      ]
    );
  }

  async function pickReceipt(source: "camera" | "library") {
    const imagePicker = getImagePicker();
    if (!imagePicker) {
      Alert.alert("Upload računa", "Nedostaje paket expo-image-picker. Instaliraj ga pre testiranja kamere/galerije.");
      return;
    }

    const permission =
      source === "camera"
        ? await imagePicker.requestCameraPermissionsAsync()
        : await imagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Dozvola", "Nije odobrena dozvola za pristup kameri/galeriji.");
      return;
    }

    const result =
      source === "camera"
        ? await imagePicker.launchCameraAsync({
            quality: 0.75,
            mediaTypes: imagePicker.MediaTypeOptions.Images
          })
        : await imagePicker.launchImageLibraryAsync({
            quality: 0.75,
            mediaTypes: imagePicker.MediaTypeOptions.Images
          });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setUploadingReceipt(true);
    try {
      const filename = asset.fileName ?? `receipt_${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? "image/jpeg";
      const upload = await uploadFromFileUri({
        uri: asset.uri,
        filename,
        mimeType,
        folder: "receipts"
      });
      setItemDraft((prev) => ({ ...prev, receiptUrl: upload.fileUrl }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload računa nije uspeo.";
      Alert.alert("Upload računa", message);
    } finally {
      setUploadingReceipt(false);
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-white px-4 py-5">
        <Text className="text-slate-600">Učitavanje troškovnika...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-white px-4 py-5">
        <Text className="text-red-600">Greška pri učitavanju troškovnika.</Text>
      </View>
    );
  }

  if (!sheet) {
    return (
      <View className="flex-1 bg-white px-4 py-5">
        <Text className="text-xl font-bold text-slate-900">Troškovnik</Text>
        <Text className="mt-1 text-slate-600">Tura: {tour?.routeLabel ? formatRouteLabel(tour.routeLabel) : "Nepoznata relacija"}</Text>
        <Text className="mt-5 text-slate-600">Troškovnik još nije kreiran za ovu turu.</Text>

        <Pressable
          className="mt-4 rounded-xl bg-brand-600 px-4 py-3"
          onPress={() => setCreateSheetModalVisible(true)}
        >
          <Text className="text-center font-semibold text-white">Kreiraj troškovnik</Text>
        </Pressable>

        <Modal visible={isCreateSheetModalVisible} transparent animationType="slide" onRequestClose={() => setCreateSheetModalVisible(false)}>
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-3xl bg-white px-4 pb-8 pt-5">
              <Text className="text-lg font-semibold text-slate-900">Nova akontacija</Text>
              <TextInput
                value={advance}
                onChangeText={setAdvance}
                keyboardType="numeric"
                placeholder="Akontacija"
                className="mt-4 rounded-xl border border-slate-200 px-4 py-3"
              />
              <View className="mt-3 flex-row gap-2">
                {CURRENCY_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setAdvanceCurrency(option)}
                    className={`rounded-lg border px-3 py-2 ${
                      advanceCurrency === option ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"
                    }`}
                  >
                    <Text className={advanceCurrency === option ? "text-brand-700" : "text-slate-700"}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={sheetNotes}
                onChangeText={setSheetNotes}
                placeholder="Napomena (opciono)"
                className="mt-3 rounded-xl border border-slate-200 px-4 py-3"
              />
              <View className="mt-4 flex-row gap-2">
                <Pressable
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-3"
                  onPress={() => setCreateSheetModalVisible(false)}
                >
                  <Text className="text-center font-semibold text-slate-700">Odustani</Text>
                </Pressable>
                <Pressable
                  className="flex-1 rounded-xl bg-brand-600 px-4 py-3"
                  onPress={onCreateSheet}
                  disabled={createSheet.isPending}
                >
                  <Text className="text-center font-semibold text-white">
                    {createSheet.isPending ? "Kreiranje..." : "Kreiraj"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Text className="text-xl font-bold text-slate-900">Troškovnik</Text>
      <Text className="mt-1 text-slate-600">Tura: {tour?.routeLabel ? formatRouteLabel(tour.routeLabel) : "Nepoznata relacija"}</Text>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(sheet.status)}`}>{translateExpenseStatus(sheet.status)}</Text>
      </View>

      {sheet.status === "REVISED" ? (
        <View className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <Text className="font-semibold text-amber-800">Dispečer je izmenio troškovnik</Text>
          <Text className="mt-1 text-amber-700">
            Pregledaj izmenjene stavke i potvrdi ih, ili vrati troškovnik na doradu da ga sam ispraviš i ponovo pošalješ.
          </Text>
          <View className="mt-3 flex-row gap-2">
            <Pressable
              onPress={onConfirmRevision}
              disabled={confirmSheet.isPending}
              className="flex-1 rounded-xl bg-brand-600 px-4 py-3 disabled:opacity-60"
            >
              <Text className="text-center font-semibold text-white">
                {confirmSheet.isPending ? "Slanje..." : "Potvrdi izmene"}
              </Text>
            </Pressable>
            <Pressable
              onPress={onRejectRevision}
              disabled={confirmSheet.isPending}
              className="flex-1 rounded-xl border border-amber-400 px-4 py-3 disabled:opacity-60"
            >
              <Text className="text-center font-semibold text-amber-800">Vrati na doradu</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-slate-900">
            Akontacija: {safeAdvanceValue.toFixed(2)} {sheet.advanceCurrency}
          </Text>
          <Pressable
            onPress={() => {
              setAdvance(String(safeAdvanceValue));
              setAdvanceCurrency((sheet.advanceCurrency as Currency) ?? "EUR");
              setSheetNotes(sheet.notes ?? "");
              setAdvanceModalVisible(true);
            }}
            disabled={isReadOnly}
            className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
          >
            <Text className="text-xs font-semibold text-slate-700">Izmeni</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-4 gap-3">
        {groupedItems.map(([country, items]) => {
          const countryMeta = getCountryMeta(country);
          return (
            <View key={country} className="rounded-xl border border-slate-200 bg-white p-3">
              <Text className="font-semibold text-slate-900">
                {countryMeta.flag} {countryMeta.label.toUpperCase()}
              </Text>
              {items.map((item) => {
                const amountType = item.cashAmount != null ? "Gotovina" : "Kartica";
                const amountValue = item.cashAmount ?? item.cardAmount ?? 0;
                return (
                  <View key={item.id} className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <Text className="font-medium text-slate-900">
                      {item.sequence}. {item.category}
                    </Text>
                    <Text className="mt-1 text-slate-600">
                      {amountType}: {amountValue.toFixed(2)} {item.currency}
                    </Text>
                    {item.note ? <Text className="mt-1 text-slate-500">Napomena: {item.note}</Text> : null}

                    {item.receiptUrl ? (
                      <Pressable onPress={() => setPreviewReceiptUrl(item.receiptUrl)} className="mt-2 self-start overflow-hidden rounded-md border border-slate-300">
                        <Image
                          source={{ uri: item.receiptUrl }}
                          style={{ width: 64, height: 64, backgroundColor: "#e2e8f0" }}
                          resizeMode="cover"
                        />
                      </Pressable>
                    ) : null}

                    <View className="mt-3 flex-row gap-2">
                      <Pressable
                        className="rounded-md border border-slate-300 px-3 py-2 disabled:opacity-50"
                        onPress={() => onEditItem(item)}
                        disabled={isReadOnly || isItemMutationPending}
                      >
                        <Text className="text-xs font-semibold text-slate-700">Izmeni</Text>
                      </Pressable>
                      <Pressable
                        className="rounded-md border border-red-300 px-3 py-2 disabled:opacity-50"
                        onPress={() => onDeleteItem(item.id)}
                        disabled={isReadOnly || isItemMutationPending}
                      >
                        <Text className="text-xs font-semibold text-red-700">Obriši</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}

        {!normalizedItems.length ? (
          <View className="rounded-xl border border-dashed border-slate-300 p-4">
            <Text className="text-slate-600">Još nema stavki troškovnika.</Text>
          </View>
        ) : null}
      </View>

      <View className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Text className="font-semibold text-slate-900">Obračun</Text>
        <Text className="mt-2 text-slate-600">Ukupno gotovina: {formatTotals(totals.cashTotals)}</Text>
        <Text className="text-slate-600">
          Akontacija: {totals.advanceValue.toFixed(2)} {totals.currentAdvanceCurrency}
        </Text>
        <Text className="text-slate-700">
          Ostatak: {totals.remainingAdvance.toFixed(2)} {totals.currentAdvanceCurrency}
        </Text>
        <Text className="mt-2 text-slate-600">Ukupno kartica: {formatTotals(totals.cardTotals)}</Text>
      </View>

      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={onOpenCreateItem}
          disabled={isReadOnly || isItemMutationPending}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-60"
        >
          <Text className="text-center font-semibold text-slate-700">+ Dodaj stavku</Text>
        </Pressable>
        <Pressable
          onPress={onSubmitSheet}
          disabled={isReadOnly || updateSheet.isPending}
          className="flex-1 rounded-xl bg-brand-600 px-4 py-3 disabled:opacity-60"
        >
          <Text className="text-center font-semibold text-white">
            {updateSheet.isPending ? "Predaja..." : isReadOnly ? `Status: ${translateExpenseStatus(sheet.status)}` : "Predaj troškovnik"}
          </Text>
        </Pressable>
      </View>

      <Modal visible={isAdvanceModalVisible} transparent animationType="slide" onRequestClose={() => setAdvanceModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white px-4 pb-8 pt-5">
            <Text className="text-lg font-semibold text-slate-900">Izmena akontacije</Text>
            <TextInput
              value={advance}
              onChangeText={setAdvance}
              keyboardType="numeric"
              placeholder="Akontacija"
              className="mt-4 rounded-xl border border-slate-200 px-4 py-3"
            />
            <View className="mt-3 flex-row gap-2">
              {CURRENCY_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setAdvanceCurrency(option)}
                  className={`rounded-lg border px-3 py-2 ${
                    advanceCurrency === option ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"
                  }`}
                >
                  <Text className={advanceCurrency === option ? "text-brand-700" : "text-slate-700"}>{option}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={sheetNotes}
              onChangeText={setSheetNotes}
              placeholder="Napomena (opciono)"
              className="mt-3 rounded-xl border border-slate-200 px-4 py-3"
            />
            <View className="mt-4 flex-row gap-2">
              <Pressable className="flex-1 rounded-xl border border-slate-300 px-4 py-3" onPress={() => setAdvanceModalVisible(false)}>
                <Text className="text-center font-semibold text-slate-700">Odustani</Text>
              </Pressable>
              <Pressable
                className="flex-1 rounded-xl bg-brand-600 px-4 py-3"
                onPress={onSaveAdvance}
                disabled={updateSheet.isPending}
              >
                <Text className="text-center font-semibold text-white">{updateSheet.isPending ? "Čuvanje..." : "Sačuvaj"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isItemModalVisible} transparent animationType="slide" onRequestClose={() => setItemModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <ScrollView className="max-h-[90%] rounded-t-3xl bg-white px-4 pt-5" contentContainerStyle={{ paddingBottom: 32 }}>
            <Text className="text-lg font-semibold text-slate-900">{editingItemId ? "Izmena stavke" : "Nova stavka"}</Text>

            <Text className="mt-4 text-xs text-slate-500">Zemlja</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {COUNTRY_OPTIONS.map((country) => (
                <Pressable
                  key={country.code}
                  onPress={() => setItemDraft((prev) => ({ ...prev, country: country.code }))}
                  className={`rounded-lg border px-3 py-2 ${
                    itemDraft.country === country.code ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"
                  }`}
                >
                  <Text className={itemDraft.country === country.code ? "text-brand-700" : "text-slate-700"}>
                    {country.flag} {country.code}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="mt-4 text-xs text-slate-500">Kategorija</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((category) => (
                <Pressable
                  key={category}
                  onPress={() => setItemDraft((prev) => ({ ...prev, category }))}
                  className={`rounded-lg border px-3 py-2 ${
                    itemDraft.category === category ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"
                  }`}
                >
                  <Text className={itemDraft.category === category ? "text-brand-700" : "text-slate-700"}>{category}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="mt-4 text-xs text-slate-500">Tip</Text>
            <View className="mt-2 flex-row gap-2">
              <Pressable
                onPress={() => setItemDraft((prev) => ({ ...prev, paymentType: "CASH" }))}
                className={`rounded-lg border px-3 py-2 ${
                  itemDraft.paymentType === "CASH" ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"
                }`}
              >
                <Text className={itemDraft.paymentType === "CASH" ? "text-brand-700" : "text-slate-700"}>Gotovina</Text>
              </Pressable>
              <Pressable
                onPress={() => setItemDraft((prev) => ({ ...prev, paymentType: "CARD" }))}
                className={`rounded-lg border px-3 py-2 ${
                  itemDraft.paymentType === "CARD" ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"
                }`}
              >
                <Text className={itemDraft.paymentType === "CARD" ? "text-brand-700" : "text-slate-700"}>Kartica</Text>
              </Pressable>
            </View>

            <TextInput
              value={itemDraft.amount}
              onChangeText={(amount) => setItemDraft((prev) => ({ ...prev, amount }))}
              keyboardType="numeric"
              placeholder="Iznos"
              className="mt-4 rounded-xl border border-slate-200 px-4 py-3"
            />

            <Text className="mt-4 text-xs text-slate-500">Valuta</Text>
            <View className="mt-2 flex-row gap-2">
              {CURRENCY_OPTIONS.map((currency) => (
                <Pressable
                  key={currency}
                  onPress={() => setItemDraft((prev) => ({ ...prev, currency }))}
                  className={`rounded-lg border px-3 py-2 ${
                    itemDraft.currency === currency ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"
                  }`}
                >
                  <Text className={itemDraft.currency === currency ? "text-brand-700" : "text-slate-700"}>{currency}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="mt-4 text-xs text-slate-500">Datum</Text>
            <Pressable
              className="mt-2 flex-row items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              onPress={() => setShowDatePicker((v) => !v)}
            >
              <Text className="text-slate-900">{formatDate(itemDraft.date)}</Text>
              <Text className="text-slate-400">📅</Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={(() => { const d = new Date(itemDraft.date); return Number.isNaN(d.getTime()) ? new Date() : d; })()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(_, selectedDate) => {
                  if (Platform.OS !== "ios") setShowDatePicker(false);
                  if (selectedDate) setItemDraft((prev) => ({ ...prev, date: selectedDate.toISOString() }));
                }}
              />
            )}

            <TextInput
              value={itemDraft.note}
              onChangeText={(note) => setItemDraft((prev) => ({ ...prev, note }))}
              placeholder="Napomena (opciono)"
              className="mt-4 rounded-xl border border-slate-200 px-4 py-3"
            />

            <Text className="mt-4 text-xs text-slate-500">Račun</Text>
            <View className="mt-2 flex-row gap-2">
              <Pressable
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-60"
                onPress={() => pickReceipt("camera")}
                disabled={isUploadingReceipt}
              >
                <Text className="text-center text-slate-700">Fotografiši</Text>
              </Pressable>
              <Pressable
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-60"
                onPress={() => pickReceipt("library")}
                disabled={isUploadingReceipt}
              >
                <Text className="text-center text-slate-700">Iz galerije</Text>
              </Pressable>
            </View>

            {itemDraft.receiptUrl ? (
              <Pressable className="mt-3 self-start overflow-hidden rounded-md border border-slate-300" onPress={() => setPreviewReceiptUrl(itemDraft.receiptUrl)}>
                <Image source={{ uri: itemDraft.receiptUrl }} style={{ width: 72, height: 72, backgroundColor: "#e2e8f0" }} resizeMode="cover" />
              </Pressable>
            ) : null}

            <TextInput
              value={itemDraft.receiptUrl}
              onChangeText={(receiptUrl) => setItemDraft((prev) => ({ ...prev, receiptUrl }))}
              placeholder="Ili direktni URL računa (opciono)"
              className="mt-3 rounded-xl border border-slate-200 px-4 py-3"
            />

            <View className="mt-5 flex-row gap-2">
              <Pressable className="flex-1 rounded-xl border border-slate-300 px-4 py-3" onPress={() => setItemModalVisible(false)}>
                <Text className="text-center font-semibold text-slate-700">Odustani</Text>
              </Pressable>
              <Pressable
                className="flex-1 rounded-xl bg-brand-600 px-4 py-3 disabled:opacity-60"
                onPress={onSaveItem}
                disabled={isUploadingReceipt || isItemMutationPending}
              >
                <Text className="text-center font-semibold text-white">
                  {isUploadingReceipt ? "Upload..." : editingItemId ? "Sačuvaj" : "Dodaj"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={Boolean(previewReceiptUrl)} transparent animationType="fade" onRequestClose={() => setPreviewReceiptUrl(null)}>
        <View className="flex-1 bg-black">
          <Pressable className="px-4 pb-3 pt-14" onPress={() => setPreviewReceiptUrl(null)}>
            <Text className="text-base font-semibold text-white">Zatvori</Text>
          </Pressable>
          {previewReceiptUrl ? (
            <Image source={{ uri: previewReceiptUrl }} style={{ flex: 1, width: "100%" }} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </ScrollView>
  );
}



