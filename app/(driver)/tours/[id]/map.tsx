import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Alert } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "@/components/ui";
import { useTheme } from "@/providers/ThemeProvider";
import { useTourStops } from "@/queries/useTourStops";
import { stopMapsQuery } from "@/lib/maps";
import { geocodeAddress } from "@/lib/geocode";
import type { TourStop } from "@/lib/types";

type MapPoint = { seq: number; label: string; sub: string; lat: number; lng: number; color: string };

function stopColor(type?: string | null): string {
  const t = (type ?? "").toUpperCase();
  if (t.includes("UNLOAD") || t.includes("DELIV") || t.includes("ISTOVAR")) return "#dc2626";
  if (t.includes("LOAD") || t.includes("PICKUP") || t.includes("UTOVAR")) return "#16a34a";
  if (t.includes("CUSTOM") || t.includes("CARINA")) return "#d97706";
  return "#0d7d72";
}

function clean(value?: string | null): string {
  return (value ?? "").replace(/[<>]/g, "").trim();
}

function stopLabel(stop: TourStop): string {
  return clean(stop.locationName ?? stop.companyName ?? stop.city ?? "Stanica") || "Stanica";
}

function stopSub(stop: TourStop): string {
  return clean([stop.city, stop.country].filter(Boolean).join(", "));
}

function buildHtml(points: MapPoint[]): string {
  const data = JSON.stringify(points);
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
  var points = ${data};
  var map = L.map('map', { zoomControl: true, attributionControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  var latlngs = [];
  points.forEach(function (p) {
    var icon = L.divIcon({
      className: '',
      html: '<div style="background:' + p.color + ';color:#fff;width:26px;height:26px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-weight:700;font-family:sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)">' + p.seq + '</div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
    var m = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
    m.bindPopup('<b>' + p.seq + '. ' + p.label + '</b>' + (p.sub ? '<br/>' + p.sub : ''));
    latlngs.push([p.lat, p.lng]);
  });
  if (latlngs.length > 1) {
    L.polyline(latlngs, { color: '#0d7d72', weight: 4, opacity: 0.8 }).addTo(map);
    map.fitBounds(latlngs, { padding: [40, 40] });
  } else if (latlngs.length === 1) {
    map.setView(latlngs[0], 12);
  } else {
    map.setView([44.8, 20.45], 6);
  }
</script>
</body>
</html>`;
}

function externalDirectionsUrl(points: MapPoint[]): string | null {
  if (!points.length) return null;
  const coords = points.map((p) => `${p.lat},${p.lng}`);
  const origin = coords[0];
  const destination = coords[coords.length - 1];
  const waypoints = coords.slice(1, -1).join("|");
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
  return url;
}

export default function TourMapScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const tourId = params.id;
  const { data: stops = [], isLoading } = useTourStops(tourId);

  const [points, setPoints] = useState<MapPoint[] | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setResolving(true);
      const result: MapPoint[] = [];
      for (const stop of stops) {
        let lat = stop.latitude;
        let lng = stop.longitude;
        if (lat == null || lng == null) {
          const query = stopMapsQuery(stop);
          if (query) {
            const geocoded = await geocodeAddress(query);
            if (cancelled) return;
            if (geocoded) {
              lat = geocoded.lat;
              lng = geocoded.lng;
            }
          }
        }
        if (lat != null && lng != null) {
          result.push({
            seq: stop.sequence ?? result.length + 1,
            label: stopLabel(stop),
            sub: stopSub(stop),
            lat,
            lng,
            color: stopColor(stop.type)
          });
        }
      }
      if (!cancelled) {
        setPoints(result);
        setResolving(false);
      }
    }
    if (!isLoading) void run();
    return () => {
      cancelled = true;
    };
  }, [stops, isLoading]);

  const html = useMemo(() => (points ? buildHtml(points) : null), [points]);
  const dirUrl = useMemo(() => (points ? externalDirectionsUrl(points) : null), [points]);
  const loading = isLoading || resolving;

  function openExternal() {
    if (!dirUrl) return;
    Linking.openURL(dirUrl).catch(() => Alert.alert("Mape", "Otvaranje mapa nije uspelo na ovom uređaju."));
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.surface.app }}>
      <Stack.Screen options={{ title: "Mapa rute" }} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.accent.primary} />
          <Text className="mt-3 text-sm" style={{ color: theme.text.secondary }}>Priprema mape...</Text>
        </View>
      ) : !points || !points.length ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="map-outline" size={40} color={theme.text.muted} />
          <Text className="mt-3 text-center text-sm" style={{ color: theme.text.secondary }}>
            Nema koordinata za stanice ove ture. Proveri da stanice imaju adresu ili lokaciju.
          </Text>
        </View>
      ) : (
        <>
          {html ? (
            <WebView
              originWhitelist={["*"]}
              source={{ html }}
              style={{ flex: 1, backgroundColor: "#e5e7eb" }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: theme.surface.app }}>
                  <ActivityIndicator color={theme.accent.primary} />
                </View>
              )}
            />
          ) : null}
          {dirUrl ? (
            <Pressable
              onPress={openExternal}
              className="flex-row items-center justify-center gap-2 px-4 py-3"
              style={{ backgroundColor: theme.accent.primary }}
            >
              <Ionicons name="navigate-outline" size={18} color="#fff" />
              <Text className="font-semibold text-white">Navigacija (Google Mape)</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}
