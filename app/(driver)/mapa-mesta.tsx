import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import { useTheme, type AppTheme } from "@/providers/ThemeProvider";
import {
  fetchNearbyCandidates,
  useConfirmPlace,
  useCreatePlace,
  useDeletePlace,
  useDriverPlaces,
  useUpdatePlace,
  type AmenityKey,
  type AmenityMap,
  type NearbyCandidate,
  type Place,
  type PlaceType
} from "@/queries/useDriverPlaces";

type IconName = ComponentProps<typeof Ionicons>["name"];

const TYPES: { value: PlaceType; label: string; icon: IconName; color: string }[] = [
  { value: "PARKING", label: "Parking", icon: "car-outline", color: "#0d7d72" },
  { value: "FUEL", label: "Pumpa", icon: "water-outline", color: "#2563eb" },
  { value: "REST", label: "Odmorište", icon: "bed-outline", color: "#7c3aed" },
  { value: "PAUSE", label: "Pauza", icon: "cafe-outline", color: "#d97706" },
  { value: "FOOD", label: "Hrana", icon: "restaurant-outline", color: "#dc2626" },
  { value: "WASH", label: "Perionica", icon: "sparkles-outline", color: "#0891b2" },
  { value: "OTHER", label: "Ostalo", icon: "ellipsis-horizontal", color: "#64748b" }
];

const AMENITIES: { key: AmenityKey; label: string }[] = [
  { key: "parking", label: "Parking" },
  { key: "bigParking", label: "Veliki parking" },
  { key: "guarded", label: "Čuvano" },
  { key: "toilet", label: "Toalet" },
  { key: "shower", label: "Tuš" },
  { key: "restaurant", label: "Restoran" },
  { key: "fuel", label: "Gorivo" },
  { key: "truckWash", label: "Pranje kamiona" },
  { key: "wifi", label: "WiFi" },
  { key: "atm", label: "Bankomat" },
  { key: "store", label: "Prodavnica" },
  { key: "lodging", label: "Prenoćište" }
];

function typeMeta(type: string) {
  return TYPES.find((t) => t.value === type) ?? { value: "OTHER" as PlaceType, label: type, icon: "ellipse-outline" as IconName, color: "#64748b" };
}

function amenityLabel(key: string): string {
  return AMENITIES.find((a) => a.key === key)?.label ?? key;
}

function activeAmenities(map: AmenityMap): string[] {
  return Object.entries(map ?? {})
    .filter(([, v]) => v === true)
    .map(([k]) => amenityLabel(k));
}

function formatDistance(m: number | null): string | null {
  if (m == null) return null;
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function buildHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0;padding:0;background:#e5e7eb}</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: true, attributionControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  map.setView([44.8, 20.45], 6);
  var layer = L.layerGroup().addTo(map);
  var meMarker = null, tempMarker = null;
  function post(o){ if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }
  function pin(color, dim){
    return '<div style="opacity:' + (dim ? 0.5 : 1) + ';background:' + color + ';width:24px;height:24px;border-radius:12px 12px 12px 2px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);transform:rotate(45deg)"></div>';
  }
  window.renderPlaces = function(arr){
    layer.clearLayers();
    arr.forEach(function(p){
      var icon = L.divIcon({ className: '', html: pin(p.color, p.stale), iconSize: [24,24], iconAnchor: [12,24] });
      var m = L.marker([p.lat, p.lng], { icon: icon });
      m.on('click', function(){ post({ type:'marker', id: p.id }); });
      m.addTo(layer);
    });
  };
  window.setCenter = function(lat, lng, z){ map.setView([lat, lng], z || 14); };
  window.setMe = function(lat, lng){
    if (meMarker) { map.removeLayer(meMarker); }
    meMarker = L.circleMarker([lat, lng], { radius: 7, color: '#1d4ed8', weight: 2, fillColor: '#3b82f6', fillOpacity: 1 }).addTo(map);
  };
  window.setTemp = function(lat, lng){
    if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
    if (lat !== null && lat !== undefined) {
      var icon = L.divIcon({ className: '', html: '<div style="background:#111827;color:#fff;width:30px;height:30px;border-radius:15px 15px 15px 3px;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.5);transform:rotate(45deg)"><span style="transform:rotate(-45deg)">+</span></div>', iconSize: [30,30], iconAnchor: [15,30] });
      tempMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
    }
  };
  map.on('click', function(e){ post({ type:'map', lat: e.latlng.lat, lng: e.latlng.lng }); });
  map.whenReady(function(){ post({ type:'ready' }); });
</script>
</body>
</html>`;
}

type FormState = {
  editingId: string | null;
  lat: number;
  lng: number;
  type: PlaceType;
  name: string;
  note: string;
  amenities: AmenityMap;
  rating: number | null;
  visibility: "PRIVATE" | "COMPANY";
  candidates: NearbyCandidate[];
};

export default function MapaMestaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const [webReady, setWebReady] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [filter, setFilter] = useState<PlaceType | null>(null);
  const [placing, setPlacing] = useState(false);
  const [selected, setSelected] = useState<Place | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [voteRating, setVoteRating] = useState<number | null>(null);

  const placesQuery = useDriverPlaces({
    lat: center?.lat,
    lng: center?.lng,
    radius: 50000,
    types: filter ? [filter] : undefined
  });
  const places = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);

  const createPlace = useCreatePlace();
  const updatePlace = useUpdatePlace();
  const deletePlace = useDeletePlace();
  const confirmPlace = useConfirmPlace();

  const html = useMemo(() => buildHtml(), []);

  // GPS lokacija na startu.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLoc(loc);
        setCenter(loc);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Ubaci pinove kad je mapa spremna / kad se podaci promene.
  useEffect(() => {
    if (!webReady) return;
    const markers = places.map((p) => ({
      id: p.id,
      lat: p.latitude,
      lng: p.longitude,
      color: typeMeta(p.type).color,
      stale: p.status === "STALE"
    }));
    webRef.current?.injectJavaScript(`window.renderPlaces(${JSON.stringify(markers)}); true;`);
  }, [webReady, places]);

  // Centriraj na vozača.
  useEffect(() => {
    if (!webReady || !myLoc) return;
    webRef.current?.injectJavaScript(`window.setMe(${myLoc.lat}, ${myLoc.lng}); window.setCenter(${myLoc.lat}, ${myLoc.lng}, 13); true;`);
  }, [webReady, myLoc]);

  function clearTemp() {
    webRef.current?.injectJavaScript(`window.setTemp(null); true;`);
  }

  async function loadCandidates(state: FormState) {
    try {
      const candidates = await fetchNearbyCandidates(state.lat, state.lng, state.type, state.name);
      setForm((cur) => (cur && !cur.editingId ? { ...cur, candidates } : cur));
    } catch {
      // dedup je opcion — ignoriši grešku
    }
  }

  function openFormAt(lat: number, lng: number) {
    setPlacing(false);
    webRef.current?.injectJavaScript(`window.setTemp(${lat}, ${lng}); true;`);
    const state: FormState = {
      editingId: null,
      lat,
      lng,
      type: "PARKING",
      name: "",
      note: "",
      amenities: {},
      rating: null,
      visibility: "PRIVATE",
      candidates: []
    };
    setForm(state);
    void loadCandidates(state);
  }

  function openEdit(place: Place) {
    setSelected(null);
    setForm({
      editingId: place.id,
      lat: place.latitude,
      lng: place.longitude,
      type: (place.type as PlaceType) || "OTHER",
      name: place.name ?? "",
      note: place.note ?? "",
      amenities: { ...place.amenities },
      rating: null,
      visibility: place.visibility === "COMPANY" ? "COMPANY" : "PRIVATE",
      candidates: []
    });
  }

  function closeForm() {
    setForm(null);
    clearTemp();
  }

  function onMessage(event: WebViewMessageEvent) {
    let msg: { type?: string; id?: string; lat?: number; lng?: number };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === "ready") {
      setWebReady(true);
      return;
    }
    if (msg.type === "marker" && msg.id) {
      const place = places.find((p) => p.id === msg.id);
      if (place) {
        setPlacing(false);
        setVoteRating(null);
        setSelected(place);
      }
      return;
    }
    if (msg.type === "map" && placing && msg.lat != null && msg.lng != null) {
      openFormAt(msg.lat, msg.lng);
    }
  }

  function onSaveForm() {
    if (!form) return;
    if (!form.name.trim() && form.type === "OTHER") {
      Alert.alert("Mapa mesta", "Dodaj naziv ili izaberi tip mesta.");
      return;
    }
    const onError = (err: unknown) => Alert.alert("Mapa mesta", err instanceof Error ? err.message : "Čuvanje nije uspelo.");

    if (form.editingId) {
      updatePlace.mutate(
        {
          id: form.editingId,
          data: { type: form.type, name: form.name, note: form.note, amenities: form.amenities, visibility: form.visibility }
        },
        {
          onSuccess: (res) => {
            closeForm();
            setSelected(res.data);
          },
          onError
        }
      );
    } else {
      createPlace.mutate(
        {
          type: form.type,
          latitude: form.lat,
          longitude: form.lng,
          name: form.name,
          note: form.note,
          amenities: form.amenities,
          rating: form.rating,
          visibility: form.visibility
        },
        { onSuccess: () => closeForm(), onError }
      );
    }
  }

  function confirmCandidate(candidate: NearbyCandidate) {
    confirmPlace.mutate(
      { id: candidate.id, vote: 1 },
      {
        onSuccess: () => {
          closeForm();
          Alert.alert("Mapa mesta", "Potvrdio si postojeće mesto.");
        },
        onError: (err) => Alert.alert("Mapa mesta", err instanceof Error ? err.message : "Potvrda nije uspela.")
      }
    );
  }

  function vote(v: 1 | -1) {
    if (!selected) return;
    confirmPlace.mutate(
      { id: selected.id, vote: v, rating: voteRating },
      {
        onSuccess: (res) => setSelected(res.data),
        onError: (err) => Alert.alert("Mapa mesta", err instanceof Error ? err.message : "Glasanje nije uspelo.")
      }
    );
  }

  function onDelete() {
    if (!selected) return;
    Alert.alert("Brisanje", `Obrisati „${selected.name ?? typeMeta(selected.type).label}"?`, [
      { text: "Odustani", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: () =>
          deletePlace.mutate(selected.id, {
            onSuccess: () => setSelected(null),
            onError: (err) => Alert.alert("Mapa mesta", err instanceof Error ? err.message : "Brisanje nije uspelo.")
          })
      }
    ]);
  }

  const savingForm = createPlace.isPending || updatePlace.isPending;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.surface.app }}>
      {/* Gornji bar */}
      <View style={{ paddingTop: insets.top, backgroundColor: theme.surface.card, borderBottomWidth: 1, borderBottomColor: theme.surface.border }}>
        <View className="flex-row items-center justify-between px-4 pb-1 pt-2">
          <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: "800" }}>Mapa mesta</Text>
          {placesQuery.isFetching ? <ActivityIndicator size="small" color={theme.accent.primary} /> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 10, gap: 6 }}>
          <FilterChip label="Sve" active={filter === null} color={theme.accent.primary} theme={theme} onPress={() => setFilter(null)} />
          {TYPES.map((t) => (
            <FilterChip key={t.value} label={t.label} active={filter === t.value} color={t.color} theme={theme} onPress={() => setFilter(t.value)} />
          ))}
        </ScrollView>
      </View>

      {/* Prostor mape */}
      <View className="flex-1" style={{ position: "relative" }}>
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html }}
          style={{ flex: 1, backgroundColor: "#e5e7eb" }}
          javaScriptEnabled
          domStorageEnabled
          onMessage={onMessage}
          startInLoadingState
          renderLoading={() => (
            <View className="items-center justify-center" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.surface.app }}>
              <ActivityIndicator color={theme.accent.primary} />
            </View>
          )}
        />

        {/* Placing baner */}
        {placing ? (
          <View className="flex-row items-center justify-between rounded-2xl px-4 py-3" style={{ position: "absolute", top: 12, left: 12, right: 12, backgroundColor: theme.accent.primary }}>
            <Text className="flex-1 pr-2 text-sm font-semibold text-white">Tapni na mapu gde je mesto</Text>
            {myLoc ? (
              <Pressable onPress={() => openFormAt(myLoc.lat, myLoc.lng)} className="mr-2 rounded-lg bg-white/20 px-3 py-1.5">
                <Text className="text-xs font-bold text-white">Moja lokacija</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setPlacing(false)}>
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>
        ) : null}

        {/* Akcije dole desno */}
        <View style={{ position: "absolute", bottom: 24, right: 16, alignItems: "flex-end", gap: 12 }} pointerEvents="box-none">
          {myLoc ? (
            <Pressable
              onPress={() => webRef.current?.injectJavaScript(`window.setCenter(${myLoc.lat}, ${myLoc.lng}, 14); true;`)}
              className="h-12 w-12 items-center justify-center rounded-full border shadow"
              style={{ backgroundColor: theme.surface.card, borderColor: theme.surface.border }}
            >
              <Ionicons name="locate" size={22} color={theme.accent.primary} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setPlacing((v) => !v)}
            className="h-14 w-14 items-center justify-center rounded-full shadow"
            style={{ backgroundColor: placing ? "#dc2626" : theme.accent.primary }}
          >
            <Ionicons name={placing ? "close" : "add"} size={28} color="#fff" />
          </Pressable>
        </View>

        {placesQuery.isError ? (
          <View className="rounded-xl bg-red-600 px-3 py-2" style={{ position: "absolute", bottom: 24, left: 16 }}>
            <Text className="text-xs font-semibold text-white">Greška pri učitavanju mesta</Text>
          </View>
        ) : null}
      </View>

      {/* Detalji mesta */}
      <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
          {selected ? (
            <View style={{ maxHeight: "85%", backgroundColor: theme.surface.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 10 }}>
              <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 2 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.surface.border }} />
              </View>
              <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 }}>
                <PlaceDetail
                  place={selected}
                  theme={theme}
                  voteRating={voteRating}
                  onSetVoteRating={setVoteRating}
                  onClose={() => setSelected(null)}
                  onVote={vote}
                  onEdit={() => openEdit(selected)}
                  onDelete={onDelete}
                  voting={confirmPlace.isPending}
                />
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Forma pina */}
      <Modal visible={Boolean(form)} transparent animationType="slide" onRequestClose={closeForm}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
          {form ? (
            <View style={{ maxHeight: "90%", backgroundColor: theme.surface.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 10 }}>
              <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 2 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.surface.border }} />
              </View>
              <ScrollView
                style={{ paddingHorizontal: 16 }}
                contentContainerStyle={{ paddingTop: 6, paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
              >
              <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                {form.editingId ? "Izmena mesta" : "Novo mesto"}
              </Text>

              {/* Dedup kandidati */}
              {!form.editingId && form.candidates.length ? (
                <View className="mt-3 rounded-2xl border p-3" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.subtle }}>
                  <Text className="text-xs font-bold uppercase" style={{ color: theme.text.secondary }}>U blizini već postoji</Text>
                  {form.candidates.slice(0, 4).map((c) => (
                    <View key={c.id} className="mt-2 flex-row items-center gap-2">
                      <View className="flex-1">
                        <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                          {c.name ?? typeMeta(c.type).label}
                          {c.likelySame ? " · verovatno isto" : ""}
                        </Text>
                        <Text className="text-xs" style={{ color: theme.text.muted }}>
                          {typeMeta(c.type).label}
                          {formatDistance(c.distanceM) ? ` · ${formatDistance(c.distanceM)}` : ""}
                        </Text>
                      </View>
                      <Pressable onPress={() => confirmCandidate(c)} className="rounded-lg px-3 py-1.5" style={{ backgroundColor: theme.accent.primary }}>
                        <Text className="text-xs font-bold text-white">Ovo je to</Text>
                      </Pressable>
                    </View>
                  ))}
                  <Text className="mt-2 text-xs" style={{ color: theme.text.muted }}>Ako nije nijedno, popuni ispod i sačuvaj novo.</Text>
                </View>
              ) : null}

              {/* Tip */}
              <Text className="mt-4 text-xs" style={{ color: theme.text.secondary }}>Tip mesta</Text>
              <View className="mt-1 flex-row flex-wrap gap-2">
                {TYPES.map((t) => {
                  const active = form.type === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => {
                        const next = { ...form, type: t.value };
                        setForm(next);
                        if (!form.editingId) void loadCandidates(next);
                      }}
                      className="flex-row items-center gap-1.5 rounded-lg border px-3 py-2"
                      style={{ borderColor: active ? t.color : theme.surface.border, backgroundColor: active ? `${t.color}22` : theme.surface.app }}
                    >
                      <Ionicons name={t.icon} size={15} color={active ? t.color : theme.text.muted} />
                      <Text className="text-xs font-semibold" style={{ color: active ? t.color : theme.text.secondary }}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Naziv */}
              <Text className="mt-4 text-xs" style={{ color: theme.text.secondary }}>Naziv (opciono)</Text>
              <TextInput
                value={form.name}
                onChangeText={(name) => setForm((cur) => (cur ? { ...cur, name } : cur))}
                placeholder="npr. Parking Šid, Lukoil A1"
                placeholderTextColor={theme.text.muted}
                className="mt-1 rounded-xl border px-4 py-3"
                style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.app, color: theme.text.primary }}
              />

              {/* Pogodnosti */}
              <Text className="mt-4 text-xs" style={{ color: theme.text.secondary }}>Pogodnosti</Text>
              <View className="mt-1 flex-row flex-wrap gap-2">
                {AMENITIES.map((a) => {
                  const active = form.amenities[a.key] === true;
                  return (
                    <Pressable
                      key={a.key}
                      onPress={() => setForm((cur) => (cur ? { ...cur, amenities: { ...cur.amenities, [a.key]: !active } } : cur))}
                      className="rounded-lg border px-3 py-2"
                      style={{ borderColor: active ? theme.accent.primary : theme.surface.border, backgroundColor: active ? theme.accent.primaryLight : theme.surface.app }}
                    >
                      <Text className="text-xs font-semibold" style={{ color: active ? theme.accent.primaryDark : theme.text.secondary }}>{a.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Ocena (samo za novo) */}
              {!form.editingId ? (
                <>
                  <Text className="mt-4 text-xs" style={{ color: theme.text.secondary }}>Tvoja ocena (opciono)</Text>
                  <Stars value={form.rating} onChange={(rating) => setForm((cur) => (cur ? { ...cur, rating } : cur))} />
                </>
              ) : null}

              {/* Napomena / saveti */}
              <Text className="mt-4 text-xs" style={{ color: theme.text.secondary }}>Napomena / saveti (slobodan tekst)</Text>
              <TextInput
                value={form.note}
                onChangeText={(note) => setForm((cur) => (cur ? { ...cur, note } : cur))}
                placeholder="npr. veliki parking, čorba odlična, izbegavati vikendom"
                placeholderTextColor={theme.text.muted}
                multiline
                className="mt-1 rounded-xl border px-4 py-3"
                style={{ minHeight: 70, textAlignVertical: "top", borderColor: theme.surface.border, backgroundColor: theme.surface.app, color: theme.text.primary }}
              />

              {/* Vidljivost */}
              <Text className="mt-4 text-xs" style={{ color: theme.text.secondary }}>Vidljivost</Text>
              <View className="mt-1 flex-row gap-2">
                {(["PRIVATE", "COMPANY"] as const).map((v) => {
                  const active = form.visibility === v;
                  return (
                    <Pressable
                      key={v}
                      onPress={() => setForm((cur) => (cur ? { ...cur, visibility: v } : cur))}
                      className="flex-1 rounded-lg border px-3 py-2"
                      style={{ borderColor: active ? theme.accent.primary : theme.surface.border, backgroundColor: active ? theme.accent.primaryLight : theme.surface.app }}
                    >
                      <Text className="text-center text-xs font-semibold" style={{ color: active ? theme.accent.primaryDark : theme.text.secondary }}>
                        {v === "PRIVATE" ? "Samo ja" : "Moja firma"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text className="mt-1 text-[11px]" style={{ color: theme.text.muted }}>
                Globalno (za sve vozače) postaje automatski kad ga potvrdi dovoljno kolega.
              </Text>

              <View className="mt-5 flex-row gap-2">
                <Pressable className="flex-1 rounded-xl border px-4 py-3" style={{ borderColor: theme.surface.border }} onPress={closeForm}>
                  <Text className="text-center font-semibold" style={{ color: theme.text.secondary }}>Odustani</Text>
                </Pressable>
                <Pressable className="flex-1 rounded-xl px-4 py-3 disabled:opacity-60" style={{ backgroundColor: theme.accent.primary }} onPress={onSaveForm} disabled={savingForm}>
                  <Text className="text-center font-semibold text-white">{savingForm ? "Čuvanje..." : "Sačuvaj"}</Text>
                </Pressable>
              </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function FilterChip({ label, active, color, theme, onPress }: { label: string; active: boolean; color: string; theme: AppTheme; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full border px-3 py-1.5 shadow"
      style={{ backgroundColor: active ? color : theme.surface.card, borderColor: active ? color : theme.surface.border }}
    >
      <Text className="text-xs font-semibold" style={{ color: active ? "#fff" : theme.text.secondary }}>{label}</Text>
    </Pressable>
  );
}

function Stars({ value, onChange, size = 26 }: { value: number | null; onChange?: (n: number) => void; size?: number }) {
  return (
    <View className="mt-1 flex-row gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange?.(n)} hitSlop={4}>
          <Ionicons name={n <= (value ?? 0) ? "star" : "star-outline"} size={size} color="#f59e0b" />
        </Pressable>
      ))}
    </View>
  );
}

function PlaceDetail({
  place,
  theme,
  voteRating,
  onSetVoteRating,
  onClose,
  onVote,
  onEdit,
  onDelete,
  voting
}: {
  place: Place;
  theme: AppTheme;
  voteRating: number | null;
  onSetVoteRating: (n: number) => void;
  onClose: () => void;
  onVote: (v: 1 | -1) => void;
  onEdit: () => void;
  onDelete: () => void;
  voting: boolean;
}) {
  const meta = typeMeta(place.type);
  const amenities = activeAmenities(place.amenities);
  const distance = formatDistance(place.distanceM);

  return (
    <View>
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${meta.color}22` }}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-extrabold" style={{ color: theme.text.primary }}>{place.name ?? meta.label}</Text>
          <Text className="text-xs" style={{ color: theme.text.muted }}>
            {meta.label}
            {distance ? ` · ${distance}` : ""}
            {place.author ? ` · ${place.author}` : ""}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={24} color={theme.text.muted} />
        </Pressable>
      </View>

      {place.status === "STALE" ? (
        <View className="mt-3 rounded-lg px-3 py-2" style={{ backgroundColor: "#fef3c7" }}>
          <Text className="text-xs font-semibold" style={{ color: "#92400e" }}>Za proveru — davno nije potvrđeno. Ako je i dalje tu, potvrdi.</Text>
        </View>
      ) : null}

      {/* Ocena + potvrde */}
      <View style={{ flexDirection: "row", marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.surface.border, paddingVertical: 10 }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 11, textTransform: "uppercase", color: theme.text.muted, marginBottom: 2 }}>Ocena</Text>
          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.text.primary }}>
            {place.rating != null ? `${place.rating.toFixed(1)} ★` : "—"}
          </Text>
          <Text style={{ fontSize: 11, color: theme.text.muted }}>({place.ratingCount})</Text>
        </View>
        <View style={{ width: 1, backgroundColor: theme.surface.border }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 11, textTransform: "uppercase", color: theme.text.muted, marginBottom: 2 }}>Potvrde</Text>
          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.text.primary }}>{place.confirmCount}</Text>
          <Text style={{ fontSize: 11, color: theme.text.muted }}>ospor. {place.disputeCount}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: theme.surface.border }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 11, textTransform: "uppercase", color: theme.text.muted, marginBottom: 2 }}>Vidljivost</Text>
          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.text.primary }}>
            {place.visibility === "GLOBAL" ? "Globalno" : place.visibility === "COMPANY" ? "Firma" : "Privatno"}
          </Text>
        </View>
      </View>

      {amenities.length ? (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {amenities.map((a) => (
            <Text key={a} className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: theme.surface.subtle, color: theme.text.secondary }}>{a}</Text>
          ))}
        </View>
      ) : null}

      {place.note ? <Text className="mt-3 text-sm" style={{ color: theme.text.secondary }}>{place.note}</Text> : null}

      {/* Glasanje — samo za tuđa mesta (svoje si već potvrdio kreiranjem) */}
      {!place.canEdit ? (
      <View className="mt-4 rounded-2xl border p-3" style={{ borderColor: theme.surface.border }}>
        <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
          {place.myVote === 1 ? "Potvrdio si ovo mesto." : place.myVote === -1 ? "Osporio si ovo mesto." : "Da li je informacija tačna?"}
        </Text>
        <View className="mt-2 flex-row items-center gap-2">
          <Text className="text-xs" style={{ color: theme.text.muted }}>Oceni:</Text>
          <Stars value={voteRating} onChange={onSetVoteRating} size={20} />
        </View>
        <View className="mt-3 flex-row gap-2">
          <Pressable onPress={() => onVote(1)} disabled={voting} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 disabled:opacity-60" style={{ backgroundColor: theme.accent.primary }}>
            <Ionicons name="thumbs-up-outline" size={16} color="#fff" />
            <Text className="text-sm font-semibold text-white">Potvrdi</Text>
          </Pressable>
          <Pressable onPress={() => onVote(-1)} disabled={voting} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 disabled:opacity-60" style={{ borderColor: theme.surface.border }}>
            <Ionicons name="thumbs-down-outline" size={16} color={theme.text.secondary} />
            <Text className="text-sm font-semibold" style={{ color: theme.text.secondary }}>Ospori</Text>
          </Pressable>
        </View>
      </View>
      ) : (
        <Text className="mt-4 text-xs" style={{ color: theme.text.muted }}>
          Ovo je tvoje mesto. Kolege ga potvrđuju ili osporavaju; ti ga uređuješ ili brišeš.
        </Text>
      )}

      {place.canEdit ? (
        <View className="mt-3 flex-row gap-2">
          <Pressable onPress={onEdit} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5" style={{ borderColor: theme.surface.border }}>
            <Ionicons name="create-outline" size={16} color={theme.text.secondary} />
            <Text className="text-sm font-semibold" style={{ color: theme.text.secondary }}>Izmeni</Text>
          </Pressable>
          <Pressable onPress={onDelete} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5" style={{ borderColor: "#fca5a5" }}>
            <Ionicons name="trash-outline" size={16} color="#dc2626" />
            <Text className="text-sm font-semibold" style={{ color: "#dc2626" }}>Obriši</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
