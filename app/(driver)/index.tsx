import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ComponentProps } from "react";
import { useState } from "react";
import { Alert, RefreshControl, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, Text, View } from "@/components/ui";
import { formatRouteLabel, formatTourDateShort, splitRouteLabel, translateExpenseStatus, translateTourStatus } from "@/lib/formatters";
import type { AppTheme } from "@/providers/ThemeProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useChatThreads } from "@/queries/useChat";
import { useDashboardData } from "@/queries/useDashboardData";
import { useExpenseSheet } from "@/queries/useExpenseSheet";
import { useMobileDriverProfile } from "@/queries/useMobileDriverProfile";
import { useMobileProfile } from "@/queries/useMobileProfile";
import { useToursSummary } from "@/queries/useToursSummary";
import { useTourChecklist } from "@/queries/useTourChecklist";
import { useRouteStopAction, useTourStops, type RouteStopAction } from "@/queries/useTourStops";
import { openMapsNavigation, stopMapsQuery } from "@/lib/maps";
import type { TourStop } from "@/lib/types";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

function greetingByHour(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Dobro jutro";
  if (hour >= 12 && hour < 18) return "Dobar dan";
  return "Dobro veče";
}

function getInitials(name?: string | null): string {
  if (!name) return "VO";
  const chunks = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!chunks.length) return "VO";
  return chunks.map((chunk) => chunk[0]?.toUpperCase() ?? "").join("");
}

function statusTone(theme: AppTheme, status?: string | null): { bg: string; text: string } {
  if (status === "PLANNED") return { bg: theme.status.PLANNED.bg, text: theme.status.PLANNED.text };
  if (status === "CONFIRMED") return { bg: theme.status.CONFIRMED.bg, text: theme.status.CONFIRMED.text };
  if (status === "IN_TRANSIT") return { bg: theme.status.IN_TRANSIT.bg, text: theme.status.IN_TRANSIT.text };
  if (status === "COMPLETED") return { bg: theme.status.COMPLETED.bg, text: theme.status.COMPLETED.text };
  return { bg: "#e2e8f0", text: "#475569" };
}

function statusProgress(status?: string | null): number {
  if (status === "PLANNED") return 25;
  if (status === "CONFIRMED") return 45;
  if (status === "IN_TRANSIT") return 70;
  if (status === "COMPLETED") return 100;
  return 0;
}

function formatKm(value: number | null | undefined): string {
  if (!value || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 0 }).format(value);
}

function toursWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "tura";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "ture";
  return "tura";
}

function expenseDot(status?: string | null): string {
  if (status === "OPEN") return "#16a34a";
  if (status === "SUBMITTED") return "#3b82f6";
  if (status === "REVISED") return "#f59e0b";
  if (status === "CONFIRMED" || status === "APPROVED") return "#059669";
  return "#94a3b8";
}

function nextStopOf(stops: TourStop[]): TourStop | null {
  return (
    stops.find((stop) => {
      const status = stop.status?.toUpperCase();
      return Boolean(stop.id) && status !== "COMPLETED" && status !== "CANCELLED" && status !== "CANCELED" && status !== "SKIPPED";
    }) ?? null
  );
}

function QuickAction({
  href,
  label,
  iconName,
  badge
}: Readonly<{ href: string; label: string; iconName: IconName; badge?: number }>) {
  const theme = useTheme();
  return (
    <Link href={href as "./"} asChild>
      <Pressable
        className="min-w-[48%] flex-1 rounded-2xl border px-3 py-3"
        style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: theme.accent.primaryLight }}>
              <MaterialCommunityIcons name={iconName} size={20} color={theme.accent.primary} />
            </View>
            <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
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

function TourAvatar({ routeLabel }: Readonly<{ routeLabel?: string | null }>) {
  const theme = useTheme();
  const { from } = splitRouteLabel(routeLabel);
  const letter = from[0]?.toUpperCase() ?? "T";
  return (
    <View className="mr-3 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.accent.primaryLight }}>
      <Text className="text-base font-bold" style={{ color: theme.accent.primary }}>
        {letter}
      </Text>
    </View>
  );
}

export default function DriverHomeScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const { data, isLoading, isError, refetch: refetchDashboard } = useDashboardData();
  const { data: mobileProfile } = useMobileProfile(Boolean(session));
  const driverId = mobileProfile?.user.driverId ?? session?.user.driverId ?? null;
  const driverProfileQuery = useMobileDriverProfile(Boolean(driverId));
  const chatThreadsQuery = useChatThreads();
  const summaryQuery = useToursSummary();
  const insets = useSafeAreaInsets();

  const active = data?.activeTour;
  const activeId = active?.id;

  const stopsQuery = useTourStops(activeId);
  const checklistQuery = useTourChecklist(activeId);
  const expenseQuery = useExpenseSheet(activeId);
  const routeStopAction = useRouteStopAction(activeId);
  const [pendingAction, setPendingAction] = useState<RouteStopAction | null>(null);
  const [isRefreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchDashboard(),
        summaryQuery.refetch(),
        chatThreadsQuery.refetch(),
        activeId ? stopsQuery.refetch() : Promise.resolve(),
        activeId ? checklistQuery.refetch() : Promise.resolve(),
        activeId ? expenseQuery.refetch() : Promise.resolve()
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const upcoming = data?.upcomingTours ?? [];
  const unread = data?.unreadNotificationsCount ?? 0;
  const unreadMessages = chatThreadsQuery.data?.filter((thread) => thread.hasUnread).length ?? 0;
  const progress = statusProgress(active?.status);
  const activeStatusTone = statusTone(theme, active?.status);
  const { from: fromLabel, to: toLabel } = splitRouteLabel(active?.routeLabel);
  const displayName = mobileProfile?.driver?.name ?? session?.user.name ?? "Vozač";
  const driverAddress = driverProfileQuery.data?.driver.address ?? mobileProfile?.driver?.address ?? null;
  const companyName = mobileProfile?.company?.name ?? driverProfileQuery.data?.company?.name ?? null;

  const month = summaryQuery.data?.month;
  const stops = stopsQuery.data ?? [];
  const nextStop = nextStopOf(stops);
  const checklist = checklistQuery.data;
  const sheet = expenseQuery.data;

  function onStopAction(action: RouteStopAction) {
    if (!nextStop?.id) return;
    setPendingAction(action);
    routeStopAction.mutate(
      { stopId: nextStop.id, action, timestamp: new Date().toISOString() },
      {
        onSuccess: () => {
          Alert.alert("Stanica", action === "ARRIVED" ? "Dolazak je zabeležen." : "Odlazak je zabeležen.");
        },
        onError: (error) => {
          Alert.alert("Stanica", error instanceof Error ? error.message : "Akcija na stanici nije uspela.");
        },
        onSettled: () => setPendingAction(null)
      }
    );
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.surface.app }}
      contentContainerStyle={{ paddingBottom: 34 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void onRefresh()}
          tintColor={theme.accent.primary}
          colors={[theme.accent.primary]}
        />
      }
    >
      {/* Header */}
      <StatusBar style="light" />
      <View className="rounded-b-3xl px-4 pb-5" style={{ backgroundColor: theme.accent.primary, paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xs font-semibold uppercase" style={{ color: "rgba(255,255,255,0.85)" }}>
              {greetingByHour()}
            </Text>
            <Text className="mt-1 text-3xl font-extrabold" style={{ color: theme.text.inverse }} numberOfLines={1}>
              {displayName}
            </Text>
            {driverAddress ? (
              <Text className="mt-0.5 text-sm" style={{ color: "rgba(255,255,255,0.85)" }} numberOfLines={1}>
                {driverAddress}
              </Text>
            ) : null}
            <Text className="mt-0.5 text-sm" style={{ color: "rgba(255,255,255,0.85)" }} numberOfLines={1}>
              {companyName ? `Vozač · ${companyName}` : "Vozač"}
            </Text>
          </View>
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.23)", borderColor: "rgba(255,255,255,0.35)", borderWidth: 1 }}
          >
            <Text className="text-base font-bold text-white">{getInitials(displayName)}</Text>
          </View>
        </View>
      </View>

      <View className="px-4 py-4">
        {/* Active tour command center */}
        <View className="rounded-2xl border p-4" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
          <View className="flex-row items-start justify-between">
            <Text className="text-[12px] font-bold uppercase" style={{ color: theme.text.secondary }}>
              Aktivna tura
            </Text>
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: activeStatusTone.bg }}>
              <Text className="text-xs font-semibold" style={{ color: activeStatusTone.text }}>
                {active ? translateTourStatus(active.status) : "Nema"}
              </Text>
            </View>
          </View>

          <Text className="mt-2 text-2xl font-extrabold" style={{ color: theme.text.primary }}>
            {active ? formatRouteLabel(active.routeLabel) : "Nema aktivne ture"}
          </Text>
          <Text className="mt-0.5 text-sm" style={{ color: theme.text.secondary }}>
            {active ? formatTourDateShort(active.dateLabel) : "Trenutno nema ture u toku."}
          </Text>

          {active ? (
            <>
              <View className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: theme.accent.primaryLight }}>
                <View className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: theme.accent.primary }} />
              </View>
              <View className="mt-1.5 flex-row items-center justify-between">
                <Text className="text-xs" style={{ color: theme.text.muted }}>{fromLabel}</Text>
                <Text className="text-xs" style={{ color: theme.text.muted }}>{toLabel}</Text>
              </View>

              {/* Next stop with actions */}
              {nextStop ? (
                <View className="mt-4 rounded-xl border p-3" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.subtle }}>
                  <Text className="text-[11px] font-bold uppercase" style={{ color: theme.text.muted }}>Sledeća stanica</Text>
                  <Text className="mt-1 text-base font-extrabold" style={{ color: theme.text.primary }}>
                    {nextStop.sequence ? `${nextStop.sequence}. ` : ""}
                    {nextStop.locationName ?? nextStop.companyName ?? nextStop.city ?? "Stanica"}
                  </Text>
                  {nextStop.city || nextStop.country ? (
                    <Text className="mt-0.5 text-sm" style={{ color: theme.text.secondary }}>
                      {[nextStop.city, nextStop.country].filter(Boolean).join(", ")}
                    </Text>
                  ) : null}
                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      onPress={() => onStopAction("ARRIVED")}
                      disabled={routeStopAction.isPending}
                      className="flex-1 rounded-xl px-3 py-2 disabled:opacity-50"
                      style={{ backgroundColor: theme.accent.primarySoft }}
                    >
                      <Text className="text-center text-sm font-semibold" style={{ color: theme.accent.primaryDark }}>
                        {pendingAction === "ARRIVED" ? "Slanje..." : "Stigao"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onStopAction("DEPARTED")}
                      disabled={routeStopAction.isPending}
                      className="flex-1 rounded-xl px-3 py-2 disabled:opacity-50"
                      style={{ backgroundColor: theme.accent.primary }}
                    >
                      <Text className="text-center text-sm font-semibold text-white">
                        {pendingAction === "DEPARTED" ? "Slanje..." : "Krenuo"}
                      </Text>
                    </Pressable>
                  </View>
                  {(() => {
                    const mapsQuery = stopMapsQuery(nextStop);
                    return mapsQuery ? (
                      <Pressable
                        onPress={() => openMapsNavigation(mapsQuery)}
                        className="mt-2 flex-row items-center justify-center gap-2 rounded-xl px-3 py-2.5"
                        style={{ backgroundColor: theme.accent.primaryLight }}
                      >
                        <MaterialCommunityIcons name="navigation-variant-outline" size={18} color={theme.accent.primaryDark} />
                        <Text className="text-sm font-semibold" style={{ color: theme.accent.primaryDark }}>Navigacija do stanice</Text>
                      </Pressable>
                    ) : null;
                  })()}
                </View>
              ) : null}

              {/* Checklist + expense status */}
              <View className="mt-3 flex-row gap-2">
                <Link href={`/(driver)/tours/${activeId}/checklist`} asChild>
                  <Pressable className="flex-1 rounded-xl border p-3" style={{ borderColor: theme.surface.border }}>
                    <Text className="text-[11px] font-bold uppercase" style={{ color: theme.text.muted }}>Checklist</Text>
                    <Text className="mt-1 text-lg font-extrabold" style={{ color: theme.text.primary }}>
                      {checklist ? `${checklist.completedCount}/${checklist.items.length}` : "—"}
                    </Text>
                    <Text className="text-xs" style={{ color: checklist && checklist.requiredRemaining > 0 ? "#b45309" : theme.text.secondary }}>
                      {checklist
                        ? checklist.requiredRemaining > 0
                          ? `Obavezno: ${checklist.requiredRemaining}`
                          : "Spremno"
                        : "Otvori"}
                    </Text>
                  </Pressable>
                </Link>
                <Link href={`/(driver)/tours/${activeId}/expense`} asChild>
                  <Pressable className="flex-1 rounded-xl border p-3" style={{ borderColor: theme.surface.border }}>
                    <Text className="text-[11px] font-bold uppercase" style={{ color: theme.text.muted }}>Troškovnik</Text>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: expenseDot(sheet?.status) }} />
                      <Text className="text-base font-extrabold" style={{ color: theme.text.primary }}>
                        {sheet ? translateExpenseStatus(sheet.status) : "Nema"}
                      </Text>
                    </View>
                    <Text className="text-xs" style={{ color: theme.text.secondary }}>
                      {sheet?.status === "REVISED" ? "Potrebna potvrda" : "Otvori"}
                    </Text>
                  </Pressable>
                </Link>
              </View>

              {/* Detail links */}
              <View className="mt-3 flex-row gap-2">
                <Link href={`/(driver)/tours/${activeId}`} asChild>
                  <Pressable className="flex-1 rounded-xl px-4 py-3" style={{ backgroundColor: theme.accent.primarySoft }}>
                    <Text className="text-center font-semibold" style={{ color: theme.accent.primaryDark }}>Detaljnije</Text>
                  </Pressable>
                </Link>
                <Link href={`/(driver)/tours/${activeId}/documents`} asChild>
                  <Pressable className="flex-1 rounded-xl px-4 py-3" style={{ backgroundColor: "#1f4e92" }}>
                    <Text className="text-center font-semibold text-white">Dokumenta</Text>
                  </Pressable>
                </Link>
              </View>

              {/* SOS */}
              <Pressable
                onPress={() => router.push(`/(driver)/tours/${activeId}/sos` as never)}
                className="mt-2 flex-row items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3"
              >
                <MaterialCommunityIcons name="alert-octagon-outline" size={18} color="#fff" />
                <Text className="text-center font-extrabold text-white">SOS — hitan poziv</Text>
              </Pressable>
            </>
          ) : (
            <Link href="/(driver)/tours" asChild>
              <Pressable className="mt-4 rounded-xl px-4 py-3" style={{ backgroundColor: theme.accent.primary }}>
                <Text className="text-center font-semibold text-white">Pogledaj sve ture</Text>
              </Pressable>
            </Link>
          )}
        </View>

        {/* Monthly summary */}
        <Link href="/(driver)/istorija" asChild>
          <Pressable className="mt-3 flex-row items-center justify-between rounded-2xl border p-4" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
            <View className="flex-1">
              <Text className="text-[12px] font-bold uppercase" style={{ color: theme.text.secondary }}>
                {month?.label ? `Ovog meseca · ${month.label}` : "Ovog meseca"}
              </Text>
              <Text className="mt-1 text-xl font-extrabold" style={{ color: theme.text.primary }}>
                {month ? `${month.tours} ${toursWord(month.tours)} · ${formatKm(month.km)} km` : "—"}
              </Text>
              {month ? (
                <Text className="mt-0.5 text-sm" style={{ color: theme.text.secondary }}>
                  Završeno: {month.completed} · U toku: {month.activeTours}
                </Text>
              ) : null}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.text.muted} />
          </Pressable>
        </Link>

        {/* Quick actions */}
        <View className="mt-3 rounded-2xl border p-4" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
          <Text className="mb-3 text-[12px] font-bold uppercase" style={{ color: theme.text.secondary }}>
            Brze akcije
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <QuickAction href="/(driver)/putni-nalog" label="Putni nalog" iconName="clipboard-text-outline" />
            <QuickAction href="/(driver)/tours" label="Sve ture" iconName="truck-outline" />
            <QuickAction href="/(driver)/istorija" label="Istorija" iconName="history" />
            <QuickAction href="/(driver)/chat" label="Poruke" iconName="message-text-outline" badge={unreadMessages} />
            <QuickAction href="/(driver)/notifications" label="Obaveštenja" iconName="bell-outline" badge={unread} />
          </View>
        </View>

        {/* Upcoming tours */}
        <View className="mt-3 rounded-2xl border p-4" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-[12px] font-bold uppercase" style={{ color: theme.text.secondary }}>
              Predstojeće ture
            </Text>
            <Link href="/(driver)/tours" asChild>
              <Pressable>
                <Text className="text-sm font-semibold" style={{ color: theme.accent.primary }}>
                  Sve
                </Text>
              </Pressable>
            </Link>
          </View>

          {upcoming.slice(0, 3).map((tour) => {
            const tone = statusTone(theme, tour.status);
            return (
              <Link key={tour.id} href={`/(driver)/tours/${tour.id}`} asChild>
                <Pressable className="mt-3 rounded-xl border px-3 py-3" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.subtle }}>
                  <View className="flex-row items-center">
                    <TourAvatar routeLabel={tour.routeLabel} />
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between gap-2">
                        <Text className="flex-1 text-base font-extrabold" style={{ color: theme.text.primary }} numberOfLines={1}>
                          {formatRouteLabel(tour.routeLabel)}
                        </Text>
                        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: tone.bg }}>
                          <Text className="text-xs font-semibold" style={{ color: tone.text }}>
                            {translateTourStatus(tour.status)}
                          </Text>
                        </View>
                      </View>
                      <Text className="mt-0.5 text-sm" style={{ color: theme.text.secondary }}>
                        {formatTourDateShort(tour.dateLabel)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </Link>
            );
          })}

          {upcoming.length ? null : (
            <Text className="mt-3 text-sm" style={{ color: theme.text.secondary }}>
              Nema planiranih tura.
            </Text>
          )}
        </View>

        {isLoading ? <Text className="mt-4 text-sm" style={{ color: theme.text.muted }}>Osvežavanje podataka...</Text> : null}
        {isError ? <Text className="mt-4 text-sm text-red-600">Greška pri učitavanju podataka.</Text> : null}
      </View>
    </ScrollView>
  );
}
