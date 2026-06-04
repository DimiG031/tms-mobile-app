import { useMemo } from "react";
import { Alert, Linking, ScrollView } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "@/components/ui";
import { Theme } from "@/lib/theme";
import type { AppDocument, TourForwarderInfo, TourNotes, TourStop } from "@/lib/types";
import { formatDateTime, formatRouteLabel, translateTourStatus } from "@/lib/formatters";
import { useTourDetails } from "@/queries/useTourDetails";
import { useTourDocuments } from "@/queries/useTourDocuments";
import { useTourStops } from "@/queries/useTourStops";

const EMPTY = "Nije uneto";

function valueOrEmpty(value?: string | number | null): string {
  if (value == null) return EMPTY;
  const text = String(value).trim();
  return text || EMPTY;
}

function translateStopType(type?: string | null): string {
  const normalized = type?.toUpperCase();
  if (normalized === "LOADING" || normalized === "LOAD" || normalized === "PICKUP" || normalized === "UTOVAR") return "Utovar";
  if (normalized === "UNLOADING" || normalized === "UNLOAD" || normalized === "DELIVERY" || normalized === "ISTOVAR") return "Istovar";
  if (normalized === "CUSTOMS" || normalized === "CARINA") return "Carina";
  if (normalized === "BREAK" || normalized === "PAUSE" || normalized === "PAUZA") return "Pauza";
  if (normalized === "OTHER" || normalized === "OSTALO") return "Ostalo";
  return valueOrEmpty(type);
}

function translateStopStatus(status?: string | null): string {
  const normalized = status?.toUpperCase();
  if (normalized === "PLANNED") return "Planirano";
  if (normalized === "ARRIVED") return "Stigao";
  if (normalized === "IN_PROGRESS") return "U toku";
  if (normalized === "COMPLETED") return "Završeno";
  if (normalized === "SKIPPED") return "Preskočeno";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "Otkazano";
  return valueOrEmpty(status);
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <View className="mb-3 rounded-2xl border p-4" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
      <Text className="mb-3 text-xs font-bold uppercase" style={{ color: Theme.text.secondary }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: Readonly<{ label: string; value?: string | number | null }>) {
  return (
    <View className="border-b border-slate-200 py-2">
      <Text className="text-xs font-semibold uppercase" style={{ color: Theme.text.muted }}>
        {label}
      </Text>
      <Text className="mt-0.5 text-base font-semibold" style={{ color: Theme.text.primary }}>
        {valueOrEmpty(value)}
      </Text>
    </View>
  );
}

function NoteBlock({ label, value }: Readonly<{ label: string; value?: string | null }>) {
  if (!value?.trim()) return null;
  return (
    <View className="mb-2 rounded-xl bg-slate-50 p-3">
      <Text className="text-xs font-semibold uppercase" style={{ color: Theme.text.muted }}>
        {label}
      </Text>
      <Text className="mt-1 text-sm" style={{ color: Theme.text.primary }}>
        {value}
      </Text>
    </View>
  );
}

function StopCard({ stop, index }: Readonly<{ stop: TourStop; index: number }>) {
  const title = stop.locationName ?? stop.companyName ?? `Stanica ${stop.sequence ?? index + 1}`;
  const place = [stop.city, stop.country].filter(Boolean).join(", ");

  return (
    <View className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="text-base font-extrabold" style={{ color: Theme.text.primary }}>
            {stop.sequence ?? index + 1}. {title}
          </Text>
          <Text className="mt-0.5 text-sm font-semibold" style={{ color: Theme.accent.primary }}>
            {translateStopType(stop.type)}
          </Text>
        </View>
        <Text className="rounded-full bg-white px-2 py-1 text-xs font-semibold" style={{ color: Theme.text.secondary }}>
          {translateStopStatus(stop.status)}
        </Text>
      </View>

      <InfoRow label="Adresa" value={stop.address} />
      <InfoRow label="Grad i država" value={place || null} />
      <InfoRow label="Planirani dolazak" value={stop.plannedArrivalAt ? formatDateTime(stop.plannedArrivalAt) : null} />
      <InfoRow label="Planirani odlazak" value={stop.plannedDepartureAt ? formatDateTime(stop.plannedDepartureAt) : null} />
      <InfoRow label="Kontakt osoba" value={stop.contactName} />
      <InfoRow label="Telefon" value={stop.contactPhone} />
      <InfoRow label="Špediter" value={stop.freightForwarder} />
      <InfoRow label="Carinska ispostava" value={stop.customsOffice} />
      <NoteBlock label="Napomena za vozača" value={stop.driverNote} />
    </View>
  );
}

function ForwarderSection({ info }: Readonly<{ info: TourForwarderInfo | null }>) {
  return (
    <Section title="Špedicija / carina">
      <InfoRow label="Naziv špeditera" value={info?.name} />
      <InfoRow label="Carinsko mesto" value={info?.customsPlace} />
      <InfoRow label="Adresa" value={info?.address} />
      <InfoRow label="Kontakt" value={info?.contact} />
      <InfoRow label="Napomena" value={info?.note} />
    </Section>
  );
}

function NotesSection({ notes }: Readonly<{ notes?: TourNotes }>) {
  const hasDetailedNotes = Boolean(
    notes?.internalNote ||
      notes?.driverNote ||
      notes?.loadingNote ||
      notes?.unloadingNote ||
      notes?.customsNote
  );

  return (
    <Section title="Napomene">
      {hasDetailedNotes ? (
        <>
          <NoteBlock label="Interna napomena" value={notes?.internalNote} />
          <NoteBlock label="Napomena za vozača" value={notes?.driverNote} />
          <NoteBlock label="Napomena za utovar" value={notes?.loadingNote} />
          <NoteBlock label="Napomena za istovar" value={notes?.unloadingNote} />
          <NoteBlock label="Napomena za carinu" value={notes?.customsNote} />
        </>
      ) : (
        <Text className="text-sm" style={{ color: Theme.text.secondary }}>
          {EMPTY}
        </Text>
      )}
    </Section>
  );
}

function DocumentsSection({ documents }: Readonly<{ documents: AppDocument[] }>) {
  const openDocument = async (document: AppDocument) => {
    try {
      const canOpen = await Linking.canOpenURL(document.fileUrl);
      if (!canOpen) {
        Alert.alert("Dokumenta", "Dokument nije moguće otvoriti na ovom uređaju.");
        return;
      }
      await Linking.openURL(document.fileUrl);
    } catch {
      Alert.alert("Dokumenta", "Otvaranje dokumenta nije uspelo.");
    }
  };

  return (
    <Section title="Dokumenta">
      {documents.length ? (
        documents.map((document) => (
          <View key={`${document.id}-${document.fileUrl}`} className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <Text className="text-base font-bold" style={{ color: Theme.text.primary }}>
              {document.fileName}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: Theme.text.secondary }}>
              Tip: {valueOrEmpty(document.fileType)}
            </Text>
            <Pressable
              onPress={() => void openDocument(document)}
              className="mt-3 self-start rounded-lg px-3 py-2"
              style={{ backgroundColor: Theme.accent.primary }}
            >
              <Text className="text-sm font-semibold text-white">Otvori</Text>
            </Pressable>
          </View>
        ))
      ) : (
        <Text className="text-sm" style={{ color: Theme.text.secondary }}>
          {EMPTY}
        </Text>
      )}
    </Section>
  );
}

function mergeDocuments(primary: AppDocument[], secondary: AppDocument[]): AppDocument[] {
  const map = new Map<string, AppDocument>();
  for (const document of [...primary, ...secondary]) {
    map.set(document.id || document.fileUrl, document);
  }
  return Array.from(map.values());
}

export default function TourMoreDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const tourId = params.id;
  const { data: tour, isLoading, isError } = useTourDetails(tourId);
  const { data: endpointDocuments = [] } = useTourDocuments(tourId);
  const { data: endpointStops = [] } = useTourStops(tourId);

  const documents = useMemo(
    () => mergeDocuments(tour?.documents ?? [], endpointDocuments),
    [endpointDocuments, tour?.documents]
  );
  const stops = endpointStops.length ? endpointStops : (tour?.stops ?? []);

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: Theme.surface.app }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Detaljnije" }} />
      <Text className="text-3xl font-extrabold" style={{ color: Theme.text.primary }}>
        Detaljnije
      </Text>
      <Text className="mb-4 mt-1 text-sm" style={{ color: Theme.text.secondary }}>
        {tour?.routeLabel ? formatRouteLabel(tour.routeLabel) : "Kompletne informacije o turi"}
      </Text>

      {isLoading ? <Text className="mb-3 text-sm text-slate-500">Učitavanje...</Text> : null}
      {isError ? <Text className="mb-3 text-sm text-red-600">Učitavanje detalja ture nije uspelo.</Text> : null}

      <Section title="Osnovni podaci ture">
        <InfoRow label="Broj ture / referenca" value={tour?.freightOrderCode} />
        <InfoRow label="Status ture" value={translateTourStatus(tour?.status)} />
        <InfoRow label="Početak ture" value={tour?.startLocation} />
        <InfoRow label="Kraj ture" value={tour?.endLocation} />
        <InfoRow label="Datum i vreme početka" value={tour?.startDate ? formatDateTime(tour.startDate) : null} />
        <InfoRow label="Datum i vreme završetka" value={tour?.endDate ? formatDateTime(tour.endDate) : null} />
        <InfoRow label="Vozilo" value={tour?.vehicleLabel} />
        <InfoRow label="Prikolica" value={tour?.trailerLabel} />
        <InfoRow label="Napomena ture" value={tour?.notes} />
      </Section>

      <Section title="Stanice ture">
        {stops.length ? (
          stops.map((stop, index) => <StopCard key={`${stop.sequence ?? index}-${stop.locationName ?? index}`} stop={stop} index={index} />)
        ) : (
          <Text className="text-sm" style={{ color: Theme.text.secondary }}>
            {EMPTY}
          </Text>
        )}
      </Section>

      <ForwarderSection info={tour?.forwarder ?? null} />
      <DocumentsSection documents={documents} />
      <NotesSection notes={tour?.detailedNotes} />
    </ScrollView>
  );
}
