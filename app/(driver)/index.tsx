import { Link } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useDashboardData } from "@/queries/useDashboardData";
import { Theme } from "@/lib/theme";
import { formatRouteLabel, formatTourDateRange, splitRouteLabel, translateTourStatus } from "@/lib/formatters";

function getInitials(name?: string | null): string {
  if (!name) return "VO";
  const chunks = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!chunks.length) return "VO";
  return chunks.map((chunk) => chunk[0]?.toUpperCase() ?? "").join("");
}

function statusTone(status?: string | null): { bg: string; text: string } {
  if (status === "PLANNED") return { bg: Theme.status.PLANNED.bg, text: Theme.status.PLANNED.text };
  if (status === "CONFIRMED") return { bg: Theme.status.CONFIRMED.bg, text: Theme.status.CONFIRMED.text };
  if (status === "IN_TRANSIT") return { bg: Theme.status.IN_TRANSIT.bg, text: Theme.status.IN_TRANSIT.text };
  if (status === "COMPLETED") return { bg: Theme.status.COMPLETED.bg, text: Theme.status.COMPLETED.text };
  return { bg: "#e2e8f0", text: "#475569" };
}

function statusProgress(status?: string | null): number {
  if (status === "PLANNED") return 25;
  if (status === "CONFIRMED") return 45;
  if (status === "IN_TRANSIT") return 70;
  if (status === "COMPLETED") return 100;
  return 0;
}

function statCard(label: string, value: string) {
  return (
    <View className="flex-1 rounded-2xl px-3 py-3" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
      <Text className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
        {label}
      </Text>
      <Text className="mt-1 text-4xl font-extrabold text-white">{value}</Text>
    </View>
  );
}

function quickAction(
  href: string,
  label: string,
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>["name"],
  badge?: number
) {
  return (
    <Link href={href as "./"} asChild>
      <Pressable
        className="min-w-[48%] flex-1 rounded-2xl border px-3 py-3"
        style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.subtle }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: Theme.accent.primaryLight }}
            >
              <MaterialCommunityIcons name={iconName} size={18} color={Theme.accent.primary} />
            </View>
            <Text className="text-base font-semibold" style={{ color: Theme.text.primary }}>
              {label}
            </Text>
          </View>
          {badge && badge > 0 ? (
            <View className="h-5 min-w-5 items-center justify-center rounded-full px-1" style={{ backgroundColor: "#dc2626" }}>
              <Text className="text-[11px] font-bold text-white">{badge > 99 ? "99+" : badge}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

export default function DriverHomeScreen() {
  const { session } = useAuth();
  const { data, isLoading, isError } = useDashboardData(session?.user.driverId);

  const active = data?.activeTour;
  const upcoming = data?.upcomingTours ?? [];
  const unread = data?.unreadNotificationsCount ?? 0;
  const progress = statusProgress(active?.status);
  const activeStatusTone = statusTone(active?.status);
  const { from: fromLabel, to: toLabel } = splitRouteLabel(active?.routeLabel);

  return (
    <View className="flex-1" style={{ backgroundColor: Theme.surface.app }}>
      <View className="rounded-b-3xl px-4 pb-6 pt-5" style={{ backgroundColor: Theme.accent.primary }}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xs font-semibold uppercase" style={{ color: "rgba(255,255,255,0.88)" }}>
              Dobrodosli
            </Text>
            <Text className="mt-1 text-4xl font-extrabold" style={{ color: Theme.text.inverse }} numberOfLines={1}>
              {session?.user.name ?? "Vozac"}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              Vozac · A123-456
            </Text>
          </View>
          <View
            className="h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.23)", borderColor: "rgba(255,255,255,0.35)", borderWidth: 1 }}
          >
            <Text className="text-base font-bold text-white">{getInitials(session?.user.name)}</Text>
          </View>
        </View>

        <View className="mt-5 flex-row gap-2">
          {statCard("Aktivna tura", active ? "1" : "0")}
          {statCard("Predstojece", String(upcoming.length))}
          {statCard("Obavestenja", String(unread))}
        </View>
      </View>

      <View className="px-4 py-4">
        <View className="rounded-2xl border p-4" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
          <View className="flex-row items-start justify-between">
            <Text className="text-[12px] font-bold uppercase" style={{ color: Theme.text.secondary }}>
              Aktivna tura
            </Text>
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: activeStatusTone.bg }}>
              <Text className="text-xs font-semibold" style={{ color: activeStatusTone.text }}>
                {active ? translateTourStatus(active.status) : "Nema"}
              </Text>
            </View>
          </View>

          <Text className="mt-2 text-3xl font-extrabold" style={{ color: Theme.text.primary }}>
            {active ? formatRouteLabel(active.routeLabel) : "Nema aktivne ture"}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: Theme.text.secondary }}>
            {formatTourDateRange(active?.dateLabel)}
          </Text>

          <View className="mt-4 h-1.5 rounded-full" style={{ backgroundColor: Theme.accent.primaryLight }}>
            <View className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: Theme.accent.primary }} />
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-xs" style={{ color: Theme.text.muted }}>
              {fromLabel}
            </Text>
            <Text className="text-xs" style={{ color: Theme.text.muted }}>
              {toLabel}
            </Text>
          </View>

          <View className="mt-4 flex-row gap-2">
            <Link href={active ? `/(driver)/tours/${active.id}` : "/(driver)/tours"} asChild>
              <Pressable className="flex-1 rounded-xl px-4 py-3" style={{ backgroundColor: Theme.accent.primarySoft }}>
                <Text className="text-center font-semibold" style={{ color: Theme.accent.primaryDark }}>
                  Detalji
                </Text>
              </Pressable>
            </Link>
            <Link href={active ? `/(driver)/tours/${active.id}/expense` : "/(driver)/tours"} asChild>
              <Pressable className="flex-1 rounded-xl px-4 py-3" style={{ backgroundColor: Theme.accent.primary }}>
                <Text className="text-center font-semibold text-white">Troskovi</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View className="mt-3 rounded-2xl border p-4" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
          <Text className="mb-3 text-[12px] font-bold uppercase" style={{ color: Theme.text.secondary }}>
            Brze akcije
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {quickAction("/(driver)/tours", "Sve ture", "truck-outline")}
            {quickAction("/(driver)/chat", "Poruke", "message-text-outline")}
            {quickAction("/(driver)/notifications", "Obavestenja", "bell-outline", unread)}
            {quickAction("/(driver)/profile", "Profil", "account-outline")}
          </View>
        </View>

        <View className="mt-3 rounded-2xl border p-4" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-[12px] font-bold uppercase" style={{ color: Theme.text.secondary }}>
              Predstojece ture
            </Text>
            <Link href="/(driver)/tours" asChild>
              <Pressable>
                <Text className="text-sm font-semibold" style={{ color: Theme.accent.primary }}>
                  Sve
                </Text>
              </Pressable>
            </Link>
          </View>

          {upcoming.slice(0, 3).map((tour) => {
            const tone = statusTone(tour.status);
            return (
              <Link key={tour.id} href={`/(driver)/tours/${tour.id}`} asChild>
                <Pressable className="mt-3 rounded-xl border px-3 py-3" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.subtle }}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-lg font-extrabold" style={{ color: Theme.text.primary }}>
                      {formatRouteLabel(tour.routeLabel)}
                    </Text>
                    <View className="rounded-full px-3 py-1" style={{ backgroundColor: tone.bg }}>
                      <Text className="text-xs font-semibold" style={{ color: tone.text }}>
                        {translateTourStatus(tour.status)}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-1 text-sm" style={{ color: Theme.text.secondary }}>
                    {formatTourDateRange(tour.dateLabel)}
                  </Text>
                </Pressable>
              </Link>
            );
          })}

          {!upcoming.length ? <Text className="mt-3 text-sm" style={{ color: Theme.text.secondary }}>Nema planiranih tura.</Text> : null}
        </View>

        {isLoading ? <Text className="mt-4 text-sm" style={{ color: Theme.text.muted }}>Osvezavanje podataka...</Text> : null}
        {isError ? <Text className="mt-4 text-sm text-red-600">Greska pri ucitavanju podataka.</Text> : null}
      </View>
    </View>
  );
}

