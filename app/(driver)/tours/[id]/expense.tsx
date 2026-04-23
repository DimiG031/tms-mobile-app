import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Alert, Image, Modal, ScrollView } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import { useTourDetails } from "@/queries/useTourDetails";
import {
  useCreateExpenseItem,
  useCreateExpenseSheet,
  useDeleteExpenseItem,
  useExpenseSheet,
  useUpdateExpenseItem,
  useUpdateExpenseSheet
} from "@/queries/useExpenseSheet";
import type { ExpenseItem, ExpenseSheetStatus } from "@/lib/types";
import { uploadFromFileUri } from "@/services/upload";
import { getOfflineWriteQueue, subscribeOfflineQueueCount } from "@/lib/offline-queue";

type Currency = "EUR" | "RSD";
type PaymentType = "CASH" | "CARD";

const CATEGORY_OPTIONS = ["Gorivo", "Putarina", "Carina", "Spedicija", "Smestaj", "Dnevnica", "Ostalo"] as const;
const CURRENCY_OPTIONS: Currency[] = ["EUR", "RSD"];
const COUNTRY_OPTIONS = ["RS", "HR", "AT", "DE", "SI", "HU", "IT", "FR", "BA", "ME"] as const;

type ItemDraft = {
  country: string;
  category: string;
  paymentType: PaymentType;
  amount: string;
  currency: Currency;
  note: string;
  receiptUrl: string;
  date: string;
};

type ImagePickerAsset = { uri: string; fileName?: string | null; mimeType?: string | null };
type ImagePickerResult = { canceled: boolean; assets?: ImagePickerAsset[] };
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

function toStartOfDayIso(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)).toISOString();
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()}.`;
}

function formatTotals(values: Record<string, number>): string {
  const entries = Object.entries(values).filter(([, amount]) => Math.abs(amount) > 0.0001);
  if (!entries.length) return "0";
  return entries.map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`).join(" + ");
}

function statusClass(status: ExpenseSheetStatus): string {
  if (status === "OPEN") return "bg-green-100 text-green-700";
  if (status === "SUBMITTED") return "bg-slate-200 text-slate-700";
  if (status === "APPROVED") return "bg-blue-100 text-blue-700";
  return "bg-black text-white";
}

function statusLabel(status: ExpenseSheetStatus): string {
  if (status === "OPEN") return "Aktivan";
  if (status === "SUBMITTED") return "Zakljucan";
  if (status === "APPROVED") return "Odobreno";
  return "Zatvoreno";
}

function defaultDraft(): ItemDraft {
  return {
    country: "RS",
    category: "Gorivo",
    paymentType: "CARD",
    amount: "",
    currency: "EUR",
    note: "",
    receiptUrl: "",
    date: toStartOfDayIso(new Date())
  };
}

function buildItemPayload(draft: ItemDraft) {
  const amount = parseAmount(draft.amount);
  if (!amount || amount <= 0) return null;

  return {
    country: draft.country,
    category: draft.category,
    date: draft.date,
    cashAmount: draft.paymentType === "CASH" ? amount : null,
    cardAmount: draft.paymentType === "CARD" ? amount : null,
    currency: draft.currency,
    note: draft.note.trim() || null,
    receiptUrl: draft.receiptUrl.trim() || null
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

  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isAdvanceModalVisible, setAdvanceModalVisible] = useState(false);
  const [isItemModalVisible, setItemModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  const [advance, setAdvance] = useState("500");
  const [advanceCurrency, setAdvanceCurrency] = useState<Currency>("EUR");
  const [sheetNotes, setSheetNotes] = useState("");

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(defaultDraft());
  const [isUploadingReceipt, setUploadingReceipt] = useState(false);
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(new Set());
  const [hasPendingExpenseWrites, setHasPendingExpenseWrites] = useState(false);

  const isReadOnly = sheet ? sheet.status !== "OPEN" : false;
  const saveItemPending = createItem.isPending || updateItem.isPending;

  const groupedItems = useMemo(() => {
    const map = new Map<string, ExpenseItem[]>();
    for (const item of sheet?.items ?? []) {
      const key = item.country || "N/A";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [sheet?.items]);

  const totals = useMemo(() => {
    const cash: Record<string, number> = {};
    const card: Record<string, number> = {};
    for (const item of sheet?.items ?? []) {
      const currency = item.currency || "EUR";
      if (item.cashAmount != null) cash[currency] = (cash[currency] ?? 0) + item.cashAmount;
      if (item.cardAmount != null) card[currency] = (card[currency] ?? 0) + item.cardAmount;
    }
    const advCurrency = (sheet?.advanceCurrency ?? "EUR") as Currency;
    const adv = sheet?.advance ?? 0;
    const remaining = adv - (cash[advCurrency] ?? 0);
    return { cash, card, advCurrency, adv, remaining };
  }, [sheet?.advance, sheet?.advanceCurrency, sheet?.items]);

  const resetDraft = () => {
    setEditingItemId(null);
    setItemDraft(defaultDraft());
    setDatePickerVisible(false);
  };

  useEffect(() => {
    let isMounted = true;

    const refreshPendingState = async () => {
      const queue = await getOfflineWriteQueue();
      if (!isMounted) return;

      const itemIdSet = new Set<string>();
      let hasExpenseWrites = false;

      for (const entry of queue) {
        if (!entry.path.includes(`/api/tours/${tourId}/expense-sheet`)) continue;
        hasExpenseWrites = true;
        const match = entry.path.match(/\/items\/([^/]+)$/);
        if (match?.[1]) {
          itemIdSet.add(match[1]);
        }
      }

      setHasPendingExpenseWrites(hasExpenseWrites);
      setPendingItemIds(itemIdSet);
    };

    void refreshPendingState();
    const unsubscribe = subscribeOfflineQueueCount(() => {
      void refreshPendingState();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [tourId]);

  const onCreateSheet = () => {
    const parsedAdvance = parseAmount(advance);
    createSheet.mutate(
      {
        advance: parsedAdvance,
        advanceCurrency,
        notes: sheetNotes.trim() || null
      },
      {
        onSuccess: () => {
          setCreateModalVisible(false);
        },
        onError: (error) => {
          Alert.alert("Troskovnik", error instanceof Error ? error.message : "Kreiranje nije uspelo.");
        }
      }
    );
  };

  const onUpdateAdvance = () => {
    if (!sheet || isReadOnly) return;
    const parsedAdvance = parseAmount(advance);
    updateSheet.mutate(
      {
        advance: parsedAdvance,
        advanceCurrency,
        notes: sheetNotes.trim() || null
      },
      {
        onSuccess: () => setAdvanceModalVisible(false),
        onError: (error) => {
          Alert.alert("Troskovnik", error instanceof Error ? error.message : "Izmena akontacije nije uspela.");
        }
      }
    );
  };

  const onSaveItem = () => {
    if (!sheet || isReadOnly) return;

    const payload = buildItemPayload(itemDraft);
    if (!payload) {
      Alert.alert("Troskovnik", "Unesite validan iznos.");
      return;
    }

    if (!editingItemId) {
      createItem.mutate(payload, {
        onSuccess: () => {
          setItemModalVisible(false);
          resetDraft();
        },
        onError: (error) => {
          Alert.alert("Troskovnik", error instanceof Error ? error.message : "Dodavanje stavke nije uspelo.");
        }
      });
      return;
    }

    updateItem.mutate(
      { itemId: editingItemId, data: payload },
      {
        onSuccess: () => {
          setItemModalVisible(false);
          resetDraft();
        },
        onError: (error) => {
          Alert.alert("Troskovnik", error instanceof Error ? error.message : "Izmena stavke nije uspela.");
        }
      }
    );
  };

  const onDeleteItem = (itemId: string) => {
    if (isReadOnly) return;
    Alert.alert("Brisanje stavke", "Da li ste sigurni?", [
      { text: "Odustani", style: "cancel" },
      {
        text: "Obrisi",
        style: "destructive",
        onPress: () => {
          deleteItem.mutate(itemId, {
            onError: (error) => {
              Alert.alert("Troskovnik", error instanceof Error ? error.message : "Brisanje nije uspelo.");
            }
          });
        }
      }
    ]);
  };

  const onLockSheet = () => {
    if (!sheet || isReadOnly) return;
    Alert.alert("Zakljucaj troskovnik", "Nakon zakljucavanja troskovnik je read-only. Nastaviti?", [
      { text: "Odustani", style: "cancel" },
      {
        text: "Zakljucaj",
        onPress: () => {
          updateSheet.mutate(
            { status: "SUBMITTED" },
            {
              onError: (error) => {
                Alert.alert("Troskovnik", error instanceof Error ? error.message : "Zakljucavanje nije uspelo.");
              }
            }
          );
        }
      }
    ]);
  };

  const onEditItem = (item: ExpenseItem) => {
    if (isReadOnly) return;
    setEditingItemId(item.id);
    setItemDraft({
      country: item.country,
      category: item.category,
      paymentType: item.cashAmount != null ? "CASH" : "CARD",
      amount: (item.cashAmount ?? item.cardAmount ?? "").toString(),
      currency: (item.currency as Currency) ?? "EUR",
      note: item.note ?? "",
      receiptUrl: item.receiptUrl ?? "",
      date: item.date ?? toStartOfDayIso(new Date())
    });
    setItemModalVisible(true);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "dismissed") {
      setDatePickerVisible(false);
      return;
    }
    if (selectedDate) {
      setItemDraft((prev) => ({ ...prev, date: toStartOfDayIso(selectedDate) }));
    }
    setDatePickerVisible(false);
  };

  const pickReceipt = async (source: "camera" | "library") => {
    const imagePicker = getImagePicker();
    if (!imagePicker) {
      Alert.alert("Racun", "Nedostaje expo-image-picker.");
      return;
    }

    const permission =
      source === "camera"
        ? await imagePicker.requestCameraPermissionsAsync()
        : await imagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Dozvola", "Dozvola nije odobrena.");
      return;
    }

    const result =
      source === "camera"
        ? await imagePicker.launchCameraAsync({ quality: 0.75, mediaTypes: imagePicker.MediaTypeOptions.Images })
        : await imagePicker.launchImageLibraryAsync({ quality: 0.75, mediaTypes: imagePicker.MediaTypeOptions.Images });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setUploadingReceipt(true);
    try {
      const upload = await uploadFromFileUri({
        uri: asset.uri,
        filename: asset.fileName ?? `receipt_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
        folder: "receipts"
      });
      setItemDraft((prev) => ({ ...prev, receiptUrl: upload.fileUrl }));
    } catch (error) {
      Alert.alert("Racun", error instanceof Error ? error.message : "Upload nije uspeo.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white px-4 py-5">
        <Text className="text-slate-600">Ucitavanje...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-white px-4 py-5">
        <Text className="text-red-600">Greska pri ucitavanju.</Text>
      </View>
    );
  }

  if (!sheet) {
    return (
      <View className="flex-1 bg-white px-4 py-5">
        <Text className="text-xl font-bold text-slate-900">Troskovnik</Text>
        <Text className="mt-1 text-slate-600">Tura: {tour?.routeLabel ?? "Nepoznata relacija"}</Text>
        <Text className="mt-5 text-slate-600">Troskovnik nije kreiran.</Text>

        <Pressable className="mt-4 rounded-xl bg-brand-600 px-4 py-3" onPress={() => setCreateModalVisible(true)}>
          <Text className="text-center font-semibold text-white">Kreiraj troskovnik</Text>
        </Pressable>

        <Modal visible={isCreateModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
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
                    className={`rounded-lg border px-3 py-2 ${advanceCurrency === option ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"}`}
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
                <Pressable className="flex-1 rounded-xl border border-slate-300 px-4 py-3" onPress={() => setCreateModalVisible(false)}>
                  <Text className="text-center font-semibold text-slate-700">Odustani</Text>
                </Pressable>
                <Pressable className="flex-1 rounded-xl bg-brand-600 px-4 py-3" onPress={onCreateSheet} disabled={createSheet.isPending}>
                  <Text className="text-center font-semibold text-white">{createSheet.isPending ? "Kreiranje..." : "Kreiraj"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <>
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Text className="text-xl font-bold text-slate-900">Troskovnik</Text>
        <Text className="mt-1 text-slate-600">Tura: {tour?.routeLabel ?? "Nepoznata relacija"}</Text>

        <View className="mt-3 flex-row items-center justify-between">
          <Text className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(sheet.status)}`}>{statusLabel(sheet.status)}</Text>
          <Pressable
            disabled={isReadOnly}
            onPress={() => {
              setAdvance((sheet.advance ?? 0).toString());
              setAdvanceCurrency((sheet.advanceCurrency as Currency) ?? "EUR");
              setSheetNotes(sheet.notes ?? "");
              setAdvanceModalVisible(true);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50"
          >
            <Text className="text-xs font-semibold text-slate-700">Izmeni akontaciju</Text>
          </Pressable>
        </View>

        <Text className="mt-3 text-slate-700">Akontacija: {(sheet.advance ?? 0).toFixed(2)} {sheet.advanceCurrency}</Text>

        {sheet.status === "SUBMITTED" ? (
          <View className="mt-3 rounded-xl border border-slate-300 bg-slate-100 p-3">
            <Text className="text-slate-700">Troskovnik je zakljucan. Mozes zavrsiti turu.</Text>
          </View>
        ) : null}
        {hasPendingExpenseWrites ? (
          <View className="mt-3 rounded-xl border border-slate-300 bg-slate-100 p-3">
            <Text className="text-xs italic text-slate-600">Postoje lokalne izmene koje cekaju sinhronizaciju.</Text>
          </View>
        ) : null}

        <View className="mt-4 gap-3">
          {groupedItems.map(([country, items]) => (
            <View key={country} className="rounded-xl border border-slate-200 p-3">
              <Text className="text-sm font-semibold text-slate-800">{country}</Text>
              <View className="mt-2 gap-2">
                {items.map((item, index) => (
                  <View key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <Text className="text-sm font-semibold text-slate-900">
                      {item.sequence ?? index + 1}. {item.category}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-600">Datum: {formatDateLabel(item.date)}</Text>
                    <Text className="mt-1 text-xs text-slate-600">
                      {item.cashAmount != null
                        ? `Gotovina: ${item.cashAmount.toFixed(2)} ${item.currency}`
                        : `Kartica: ${(item.cardAmount ?? 0).toFixed(2)} ${item.currency}`}
                    </Text>
                    {pendingItemIds.has(item.id) ? (
                      <Text className="mt-1 text-xs italic text-slate-500">Sinhronizacija na cekanju...</Text>
                    ) : null}
                    {item.note ? <Text className="mt-1 text-xs text-slate-600">Napomena: {item.note}</Text> : null}

                    {item.receiptUrl ? (
                      <Pressable onPress={() => setPreviewReceiptUrl(item.receiptUrl ?? null)} className="mt-2 self-start">
                        <Image source={{ uri: item.receiptUrl }} style={{ width: 72, height: 72, borderRadius: 8 }} />
                      </Pressable>
                    ) : null}

                    {!isReadOnly ? (
                      <View className="mt-3 flex-row gap-2">
                        <Pressable className="rounded-lg border border-slate-300 px-3 py-2" onPress={() => onEditItem(item)}>
                          <Text className="text-xs font-semibold text-slate-700">Izmeni</Text>
                        </Pressable>
                        <Pressable
                          className="rounded-lg border border-red-300 px-3 py-2 disabled:opacity-50"
                          onPress={() => onDeleteItem(item.id)}
                          disabled={deleteItem.isPending}
                        >
                          <Text className="text-xs font-semibold text-red-600">Obrisi</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View className="mt-5 rounded-xl border border-slate-200 p-3">
          <Text className="text-sm font-semibold text-slate-800">Obracun</Text>
          <Text className="mt-2 text-sm text-slate-700">Ukupno gotovina: {formatTotals(totals.cash)}</Text>
          <Text className="mt-1 text-sm text-slate-700">Akontacija: {totals.adv.toFixed(2)} {totals.advCurrency}</Text>
          <Text className="mt-1 text-sm text-slate-700">Ostatak: {totals.remaining.toFixed(2)} {totals.advCurrency}</Text>
          <Text className="mt-2 text-sm text-slate-700">Ukupno kartica: {formatTotals(totals.card)}</Text>
        </View>

        <View className="mt-5 flex-row gap-2">
          <Pressable
            disabled={isReadOnly}
            onPress={() => {
              resetDraft();
              setItemModalVisible(true);
            }}
            className="flex-1 rounded-xl border border-brand-500 px-4 py-3 disabled:opacity-50"
          >
            <Text className="text-center font-semibold text-brand-600">+ Dodaj stavku</Text>
          </Pressable>

          {sheet.status === "OPEN" ? (
            <Pressable
              onPress={onLockSheet}
              disabled={updateSheet.isPending}
              className="flex-1 rounded-xl bg-brand-600 px-4 py-3 disabled:opacity-60"
            >
              <Text className="text-center font-semibold text-white">
                {updateSheet.isPending ? "Zakljucavanje..." : "Zakljucaj troskovnik"}
              </Text>
            </Pressable>
          ) : (
            <View className="flex-1 rounded-xl border border-slate-300 px-4 py-3">
              <Text className="text-center font-semibold text-slate-600">Zakljucano ?</Text>
            </View>
          )}
        </View>
      </ScrollView>

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
              editable={!isReadOnly}
            />

            <View className="mt-3 flex-row gap-2">
              {CURRENCY_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setAdvanceCurrency(option)}
                  disabled={isReadOnly}
                  className={`rounded-lg border px-3 py-2 ${advanceCurrency === option ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"}`}
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
              editable={!isReadOnly}
            />

            <View className="mt-4 flex-row gap-2">
              <Pressable className="flex-1 rounded-xl border border-slate-300 px-4 py-3" onPress={() => setAdvanceModalVisible(false)}>
                <Text className="text-center font-semibold text-slate-700">Zatvori</Text>
              </Pressable>
              <Pressable className="flex-1 rounded-xl bg-brand-600 px-4 py-3" onPress={onUpdateAdvance} disabled={updateSheet.isPending || isReadOnly}>
                <Text className="text-center font-semibold text-white">{updateSheet.isPending ? "Cuvanje..." : "Sacuvaj"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isItemModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setItemModalVisible(false);
          resetDraft();
        }}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white px-4 pb-8 pt-5">
            <Text className="text-lg font-semibold text-slate-900">{editingItemId ? "Izmena stavke" : "Nova stavka"}</Text>

            <Text className="mt-3 text-xs font-semibold text-slate-600">Zemlja</Text>
            <View className="mt-1 flex-row flex-wrap gap-2">
              {COUNTRY_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setItemDraft((prev) => ({ ...prev, country: option }))}
                  className={`rounded-lg border px-3 py-2 ${itemDraft.country === option ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"}`}
                >
                  <Text className={itemDraft.country === option ? "text-brand-700" : "text-slate-700"}>{option}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="mt-3 text-xs font-semibold text-slate-600">Kategorija</Text>
            <View className="mt-1 flex-row flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setItemDraft((prev) => ({ ...prev, category: option }))}
                  className={`rounded-lg border px-3 py-2 ${itemDraft.category === option ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"}`}
                >
                  <Text className={itemDraft.category === option ? "text-brand-700" : "text-slate-700"}>{option}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="mt-3 text-xs font-semibold text-slate-600">Datum</Text>
            <Pressable
              className="mt-1 rounded-xl border border-slate-200 px-4 py-3"
              onPress={() => setDatePickerVisible(true)}
            >
              <Text className="text-slate-700">{formatDateLabel(itemDraft.date)}</Text>
            </Pressable>

            {isDatePickerVisible ? (
              <DateTimePicker
                value={new Date(itemDraft.date)}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            ) : null}

            <Text className="mt-3 text-xs font-semibold text-slate-600">Tip placanja</Text>
            <View className="mt-1 flex-row gap-2">
              {([
                { label: "Gotovina", value: "CASH" },
                { label: "Kartica", value: "CARD" }
              ] as const).map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setItemDraft((prev) => ({ ...prev, paymentType: option.value }))}
                  className={`rounded-lg border px-3 py-2 ${itemDraft.paymentType === option.value ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"}`}
                >
                  <Text className={itemDraft.paymentType === option.value ? "text-brand-700" : "text-slate-700"}>{option.label}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={itemDraft.amount}
              onChangeText={(value) => setItemDraft((prev) => ({ ...prev, amount: value }))}
              keyboardType="numeric"
              placeholder="Iznos"
              className="mt-3 rounded-xl border border-slate-200 px-4 py-3"
            />

            <View className="mt-3 flex-row gap-2">
              {CURRENCY_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setItemDraft((prev) => ({ ...prev, currency: option }))}
                  className={`rounded-lg border px-3 py-2 ${itemDraft.currency === option ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"}`}
                >
                  <Text className={itemDraft.currency === option ? "text-brand-700" : "text-slate-700"}>{option}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={itemDraft.note}
              onChangeText={(value) => setItemDraft((prev) => ({ ...prev, note: value }))}
              placeholder="Napomena (opciono)"
              className="mt-3 rounded-xl border border-slate-200 px-4 py-3"
            />

            <View className="mt-3 flex-row gap-2">
              <Pressable className="rounded-lg border border-slate-300 px-3 py-2" onPress={() => void pickReceipt("camera")}>
                <Text className="text-xs font-semibold text-slate-700">Fotografisi</Text>
              </Pressable>
              <Pressable className="rounded-lg border border-slate-300 px-3 py-2" onPress={() => void pickReceipt("library")}>
                <Text className="text-xs font-semibold text-slate-700">Galerija</Text>
              </Pressable>
            </View>

            {isUploadingReceipt ? <Text className="mt-2 text-xs text-slate-500">Upload racuna...</Text> : null}

            {itemDraft.receiptUrl ? (
              <Pressable className="mt-2 self-start" onPress={() => setPreviewReceiptUrl(itemDraft.receiptUrl)}>
                <Image source={{ uri: itemDraft.receiptUrl }} style={{ width: 72, height: 72, borderRadius: 8 }} />
              </Pressable>
            ) : null}

            <View className="mt-4 flex-row gap-2">
              <Pressable
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3"
                onPress={() => {
                  setItemModalVisible(false);
                  resetDraft();
                }}
              >
                <Text className="text-center font-semibold text-slate-700">Odustani</Text>
              </Pressable>
              <Pressable
                className="flex-1 rounded-xl bg-brand-600 px-4 py-3 disabled:opacity-60"
                onPress={onSaveItem}
                disabled={saveItemPending || isReadOnly}
              >
                <Text className="text-center font-semibold text-white">
                  {saveItemPending ? "Cuvanje..." : editingItemId ? "Sacuvaj" : "Dodaj"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(previewReceiptUrl)} transparent animationType="fade" onRequestClose={() => setPreviewReceiptUrl(null)}>
        <View className="flex-1 items-center justify-center bg-black/80 px-4">
          <Pressable className="absolute right-5 top-12 rounded-full border border-white px-3 py-1" onPress={() => setPreviewReceiptUrl(null)}>
            <Text className="text-white">Zatvori</Text>
          </Pressable>
          {previewReceiptUrl ? <Image source={{ uri: previewReceiptUrl }} style={{ width: "100%", height: "80%" }} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </>
  );
}
