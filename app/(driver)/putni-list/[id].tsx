import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import {
  emptyTravelOrderLine,
  useSaveTravelOrderLines,
  useTravelOrderLines,
  type TravelOrderLine
} from "@/queries/useTravelOrderLines";
import { useTravelOrders } from "@/queries/useTravelOrders";
import { formatDate } from "@/lib/formatters";
import { useTheme } from "@/providers/ThemeProvider";
import type { AppTheme } from "@/providers/ThemeProvider";

type TimeField = "departAt" | "arriveAt" | "loadAt" | "unloadAt";
type PickerTarget = { index: number; field: "date" | TimeField };

function parseNum(value: string): number | null {
  const cleaned = value.replace(",", ".").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function numText(value: number | null): string {
  return value == null ? "" : String(value);
}

function hhmm(iso: string | null): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dayOfMonth(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return String(d.getDate());
}

// Namerno preko formatDate, a ne toLocaleDateString — Hermes na Androidu
// nema podatke za sr-RS i vraca americki format (10/16/2026).
function dateLabel(iso: string | null): string {
  if (!iso) return "Izaberi datum";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Izaberi datum";
  return formatDate(iso);
}

// Vreme se čuva kao pun ISO; spajamo izabrani sat sa datumom reda.
function withTimeOf(baseIso: string | null, picked: Date): string {
  const base = baseIso ? new Date(baseIso) : new Date();
  const next = Number.isNaN(base.getTime()) ? new Date() : base;
  next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return next.toISOString();
}

export default function PutniListScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = typeof id === "string" ? id : "";

  const ordersQuery = useTravelOrders();
  const linesQuery = useTravelOrderLines(orderId);
  const saveLines = useSaveTravelOrderLines();

  const order = ordersQuery.data?.find((item) => item.id === orderId);
  const [lines, setLines] = useState<TravelOrderLine[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const lineEditStatus = linesQuery.data?.lineEditStatus ?? "NONE";
  // Niz-provere: React Query persist moze da vrati kesiran odgovor iz starije
  // verzije aplikacije, kad je ovaj endpoint vracao goli niz redova.
  const original = Array.isArray(linesQuery.data?.linesOriginal) ? linesQuery.data.linesOriginal : [];
  // Dva razloga za zakljucavanje: dispecer uredjuje (409 na PUT), ili ovo
  // gleda drugi vozac iz dvojne posade (PUT ostaje glavnom vozacu).
  const viewerIsCoDriver = linesQuery.data?.viewerIsCoDriver === true;
  const locked = lineEditStatus === "APPROVED" || linesQuery.data?.readOnly === true;
  const viewing = showOriginal ? original : Array.isArray(lines) ? lines : [];

  // Server je izvor istine dok vozač ne počne da menja.
  useEffect(() => {
    if (linesQuery.data && !dirty) setLines(Array.isArray(linesQuery.data.lines) ? linesQuery.data.lines : []);
  }, [linesQuery.data, dirty]);

  const totalKm = useMemo(
    () => viewing.reduce((sum, line) => sum + (line.kmDone ?? 0), 0),
    [viewing]
  );

  function patchLine(index: number, patch: Partial<TravelOrderLine>) {
    setDirty(true);
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setDirty(true);
    // Nov red nastavlja od datuma poslednjeg, da vozač ne bira iznova.
    const last = lines[lines.length - 1];
    const base = last?.date ? new Date(last.date) : new Date();
    setLines((current) => [...current, emptyTravelOrderLine(base)]);
    setExpanded(lines.length);
  }

  function removeLine(index: number) {
    Alert.alert("Putni list", "Obrisati ovaj red?", [
      { text: "Odustani", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: () => {
          setDirty(true);
          setLines((current) => current.filter((_, i) => i !== index));
          setExpanded(null);
        }
      }
    ]);
  }

  function onSave() {
    if (!orderId) return;
    saveLines.mutate(
      { orderId, lines },
      {
        onSuccess: () => {
          setDirty(false);
          Alert.alert("Putni list", "Putni list je sačuvan.");
        },
        onError: (err) => Alert.alert("Putni list", err instanceof Error ? err.message : "Čuvanje nije uspelo.")
      }
    );
  }

  const pickerValue = (() => {
    if (!picker) return new Date();
    const line = lines[picker.index];
    const raw = picker.field === "date" ? line?.date : line?.[picker.field];
    const d = raw ? new Date(raw) : new Date();
    return Number.isNaN(d.getTime()) ? new Date() : d;
  })();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.surface.app }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-sm" style={{ color: theme.text.secondary }}>
          {order?.number ?? "Putni nalog"}
          {order?.route ? ` · ${order.route}` : ""}
        </Text>
        <Text className="mt-1 text-xs" style={{ color: theme.text.muted }}>
          Tabela kretanja (obrazac SERIJA B). Dispečer je štampa uz nalog.
        </Text>

        {locked ? (
          <View className="mt-3 rounded-xl border px-3 py-2.5" style={{ borderColor: theme.status.IN_TRANSIT.text, backgroundColor: theme.status.IN_TRANSIT.bg }}>
            <Text className="text-xs font-semibold" style={{ color: theme.status.IN_TRANSIT.text }}>
              {viewerIsCoDriver
                ? "Dvojna posada — pregled. Putni list vodi glavni vozač; ako nešto nije u redu, javi preko Poruka."
                : "Dispečer trenutno uređuje ovaj putni list — tvoj unos je zaključan."}
            </Text>
          </View>
        ) : null}

        {original.length ? (
          <View className="mt-3 flex-row gap-2">
            {([[false, "Original (moj)"], [true, "Izmena (dispečer)"]] as const).map(([key, label]) => {
              const on = showOriginal === key;
              return (
                <Pressable
                  key={label}
                  onPress={() => setShowOriginal(key)}
                  className="rounded-full border px-3 py-1.5"
                  style={{
                    borderColor: on ? theme.accent.primary : theme.surface.border,
                    backgroundColor: on ? theme.accent.primary : "transparent"
                  }}
                >
                  <Text className="text-xs font-semibold" style={{ color: on ? "#fff" : theme.text.secondary }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {linesQuery.isLoading ? <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 24 }} /> : null}

        {linesQuery.isError ? (
          <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
            <Text className="font-semibold text-red-700 dark:text-red-300">Greška pri učitavanju putnog lista</Text>
            <Text className="mt-1 text-xs text-red-600 dark:text-red-400">
              {linesQuery.error instanceof Error ? linesQuery.error.message : "Nepoznata greška."}
            </Text>
            <Pressable
              onPress={() => linesQuery.refetch()}
              className="mt-2 self-start rounded-lg border px-3 py-1.5"
              style={{ borderColor: theme.surface.border }}
            >
              <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>Pokušaj ponovo</Text>
            </Pressable>
          </View>
        ) : null}

        {!linesQuery.isLoading && !linesQuery.isError && !viewing.length ? (
          <View className="mt-4 rounded-2xl border border-dashed p-4" style={{ borderColor: theme.surface.border }}>
            <Text className="text-sm" style={{ color: theme.text.secondary }}>
              Putni list je prazan. Dodaj prvi red kretanja.
            </Text>
          </View>
        ) : null}

        <View className="mt-4 gap-3">
          {viewing.map((line, index) => (
            <LineCard
              key={index}
              line={line}
              index={index}
              theme={theme}
              readOnly={showOriginal || locked}
              expanded={expanded === index}
              onToggle={() => setExpanded((current) => (current === index ? null : index))}
              onPatch={(patch) => patchLine(index, patch)}
              onRemove={() => removeLine(index)}
              onPick={(field) => setPicker({ index, field })}
            />
          ))}
        </View>

        {showOriginal || locked ? null : (
        <Pressable
          onPress={addLine}
          className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3"
          style={{ borderColor: theme.accent.primary }}
        >
          <Ionicons name="add" size={18} color={theme.accent.primary} />
          <Text className="font-semibold" style={{ color: theme.accent.primary }}>Dodaj red</Text>
        </Pressable>
        )}

        {viewing.length ? (
          <View className="mt-4 flex-row justify-between rounded-xl border px-4 py-3" style={{ borderColor: theme.surface.border }}>
            <Text className="text-sm" style={{ color: theme.text.secondary }}>Ukupno pređeno</Text>
            <Text className="text-sm font-bold" style={{ color: theme.text.primary }}>{totalKm} km</Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        className="border-t px-4 py-3"
        style={{ borderTopColor: theme.surface.border, backgroundColor: theme.surface.card }}
      >
        <Pressable
          onPress={onSave}
          disabled={saveLines.isPending || !dirty || locked || showOriginal}
          className="rounded-xl px-4 py-3 disabled:opacity-50"
          style={{ backgroundColor: theme.accent.primary }}
        >
          <Text className="text-center font-semibold text-white">
            {locked
              ? "Zaključano"
              : saveLines.isPending
              ? "Čuvanje..."
              : dirty
              ? "Sačuvaj putni list"
              : "Sačuvano"}
          </Text>
        </Pressable>
      </View>

      {picker ? (
        <DateTimePicker
          value={pickerValue}
          mode={picker.field === "date" ? "date" : "time"}
          is24Hour
          display={Platform.OS === "ios" ? (picker.field === "date" ? "inline" : "spinner") : "default"}
          onChange={(_, selected) => {
            const target = picker;
            if (Platform.OS !== "ios") setPicker(null);
            if (!selected || !target) return;
            if (target.field === "date") {
              patchLine(target.index, { date: selected.toISOString() });
            } else {
              const base = lines[target.index]?.date ?? null;
              patchLine(target.index, { [target.field]: withTimeOf(base, selected) } as Partial<TravelOrderLine>);
            }
          }}
        />
      ) : null}

      {picker && Platform.OS === "ios" ? (
        <Pressable onPress={() => setPicker(null)} className="px-4 pb-3">
          <Text className="text-center font-semibold" style={{ color: theme.accent.primary }}>Gotovo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Field({
  label,
  theme,
  children
}: {
  label: string;
  theme: AppTheme;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-1 text-xs font-semibold" style={{ color: theme.text.secondary }}>{label}</Text>
      {children}
    </View>
  );
}

function LineCard({
  line,
  index,
  theme,
  readOnly,
  expanded,
  onToggle,
  onPatch,
  onRemove,
  onPick
}: {
  line: TravelOrderLine;
  index: number;
  theme: AppTheme;
  readOnly: boolean;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<TravelOrderLine>) => void;
  onRemove: () => void;
  onPick: (field: "date" | TimeField) => void;
}) {
  const inputClass = "rounded-lg border px-3 py-2";
  const inputStyle = {
    borderColor: theme.surface.border,
    backgroundColor: theme.surface.app,
    color: theme.text.primary
  };

  function textInput(
    value: string,
    onChangeText: (v: string) => void,
    extra?: { numeric?: boolean; placeholder?: string }
  ) {
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={extra?.placeholder}
        placeholderTextColor={theme.text.muted}
        editable={!readOnly}
        keyboardType={extra?.numeric ? "numeric" : "default"}
        className={inputClass}
        style={inputStyle}
      />
    );
  }

  function timeButton(label: string, field: TimeField) {
    return (
      <Field label={label} theme={theme}>
        <Pressable onPress={() => onPick(field)} disabled={readOnly} className={inputClass} style={inputStyle}>
          <Text style={{ color: line[field] ? theme.text.primary : theme.text.muted }}>{hhmm(line[field])}</Text>
        </Pressable>
      </Field>
    );
  }

  return (
    <View className="rounded-2xl border" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
      <Pressable onPress={onToggle} className="flex-row items-center justify-between gap-2 p-4">
        <View className="flex-1">
          <Text className="text-base font-extrabold" style={{ color: theme.text.primary }} numberOfLines={1}>
            {dayOfMonth(line.date)}. · {line.fromPlace || "—"} → {line.toPlace || "—"}
          </Text>
          <Text className="mt-0.5 text-xs" style={{ color: theme.text.muted }}>
            {hhmm(line.departAt)}–{hhmm(line.arriveAt)}
            {line.odometer != null ? ` · ${line.odometer} km na satu` : ""}
            {line.kmDone != null ? ` · pređeno ${line.kmDone} km` : ""}
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.text.muted} />
      </Pressable>

      {expanded ? (
        <View className="gap-3 border-t px-4 pb-4 pt-3" style={{ borderTopColor: theme.surface.border }}>
          <View className="flex-row gap-3">
            <Field label="Dan u mesecu" theme={theme}>
              <Pressable onPress={() => onPick("date")} disabled={readOnly} className={inputClass} style={inputStyle}>
                <Text style={{ color: line.date ? theme.text.primary : theme.text.muted }}>{dateLabel(line.date)}</Text>
              </Pressable>
            </Field>
            <Field label="Stanje na satu (km)" theme={theme}>
              {textInput(numText(line.odometer), (v) => onPatch({ odometer: parseNum(v) }), { numeric: true, placeholder: "0" })}
            </Field>
          </View>

          <View className="flex-row gap-3">
            <Field label="Mesto polaska" theme={theme}>
              {textInput(line.fromPlace ?? "", (v) => onPatch({ fromPlace: v || null }), { placeholder: "Požega" })}
            </Field>
            <Field label="Mesto dolaska" theme={theme}>
              {textInput(line.toPlace ?? "", (v) => onPatch({ toPlace: v || null }), { placeholder: "Beograd" })}
            </Field>
          </View>

          <View className="flex-row gap-3">
            {timeButton("Vreme polaska", "departAt")}
            {timeButton("Vreme dolaska", "arriveAt")}
          </View>

          <View className="flex-row gap-3">
            {timeButton("Utovar", "loadAt")}
            {timeButton("Istovar", "unloadAt")}
          </View>

          <View className="flex-row gap-3">
            <Field label="Zadržavanje (min)" theme={theme}>
              {textInput(numText(line.delayMinutes), (v) => onPatch({ delayMinutes: parseNum(v) }), { numeric: true, placeholder: "0" })}
            </Field>
            <Field label="Pređeno km" theme={theme}>
              {textInput(numText(line.kmDone), (v) => onPatch({ kmDone: parseNum(v) }), { numeric: true, placeholder: "0" })}
            </Field>
          </View>

          <Field label="Uzrok zadržavanja" theme={theme}>
            {textInput(line.delayCause ?? "", (v) => onPatch({ delayCause: v || null }), { placeholder: "npr. gužva na carini" })}
          </Field>

          <View className="flex-row gap-3">
            <Field label="Teret — vozilo (kg)" theme={theme}>
              {textInput(numText(line.cargoKgVehicle), (v) => onPatch({ cargoKgVehicle: parseNum(v) }), { numeric: true, placeholder: "0" })}
            </Field>
            <Field label="Teret — prikolica (kg)" theme={theme}>
              {textInput(numText(line.cargoKgTrailer), (v) => onPatch({ cargoKgTrailer: parseNum(v) }), { numeric: true, placeholder: "0" })}
            </Field>
          </View>

          <View className="flex-row gap-3">
            <Field label="Izvršeno t/km" theme={theme}>
              {textInput(numText(line.tkm), (v) => onPatch({ tkm: parseNum(v) }), { numeric: true, placeholder: "0" })}
            </Field>
            <Field label="Br. tovarnog lista" theme={theme}>
              {textInput(line.freightDocNo ?? "", (v) => onPatch({ freightDocNo: v || null }), { placeholder: "TL-2026-0012" })}
            </Field>
          </View>

          <Field label="Primedba" theme={theme}>
            {textInput(line.note ?? "", (v) => onPatch({ note: v || null }), { placeholder: "kvar, zastoj na putu i sl." })}
          </Field>

          {readOnly ? null : (
            <Pressable onPress={onRemove} className="flex-row items-center justify-center gap-1.5 py-1">
              <Ionicons name="trash-outline" size={16} color="#dc2626" />
              <Text className="text-sm font-semibold" style={{ color: "#dc2626" }}>Obriši red {index + 1}</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}
