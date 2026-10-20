import { useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "@/components/ui";
import {
  useUpdateWorkTask,
  useWorkTasksHistory,
  useWorkTasks,
  workTaskStatusLabel,
  workTaskTypeLabel,
  type WorkTask,
  type WorkTaskStatusInput
} from "@/queries/useWorkTasks";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { useTheme } from "@/providers/ThemeProvider";
import type { AppTheme } from "@/providers/ThemeProvider";

function statusMeta(theme: AppTheme, status: string): { label: string; bg: string; text: string } {
  if (status === "OPEN") return { label: "Otvoren", bg: theme.status.PLANNED.bg, text: theme.status.PLANNED.text };
  if (status === "IN_PROGRESS") return { label: "U toku", bg: theme.status.IN_TRANSIT.bg, text: theme.status.IN_TRANSIT.text };
  if (status === "DONE") return { label: "Gotovo", bg: theme.status.COMPLETED.bg, text: theme.status.COMPLETED.text };
  if (status === "CANCELED") return { label: "Otkazano", bg: theme.status.CANCELLED.bg, text: theme.status.CANCELLED.text };
  return { label: workTaskStatusLabel(status), bg: theme.surface.subtle, text: theme.text.secondary };
}

export default function ZadaciScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = useWorkTasks();
  const updateTask = useUpdateWorkTask();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");

  const history = useWorkTasksHistory();
  const tasks = data ?? [];
  const historyTasks = history.data?.pages.flatMap((page) => page.items) ?? [];
  const isHistory = tab === "history";

  const loading = isHistory ? history.isLoading : isLoading;
  const failed = isHistory ? history.isError : isError;
  const failure = isHistory ? history.error : error;
  const retry = isHistory ? history.refetch : refetch;
  const visible = isHistory ? historyTasks : tasks;

  async function onRefresh() {
    setIsRefreshing(true);
    try {
      await (isHistory ? history.refetch() : refetch());
    } finally {
      setIsRefreshing(false);
    }
  }

  function setStatus(task: WorkTask, status: WorkTaskStatusInput) {
    setPendingId(task.id);
    updateTask.mutate(
      { id: task.id, status },
      {
        onError: (err) => Alert.alert("Zadaci", err instanceof Error ? err.message : "Izmena nije uspela."),
        onSettled: () => setPendingId(null)
      }
    );
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.surface.app }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 14, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void onRefresh()}
          tintColor={theme.accent.primary}
          colors={[theme.accent.primary]}
        />
      }
    >
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <View>
        <Text style={{ color: theme.text.primary, fontSize: 26, fontWeight: "800" }}>Zadaci</Text>
        <Text className="mt-0.5 text-sm" style={{ color: theme.text.secondary }}>
          Utovar, istovar i ostali zadaci koje ti je dispečer dodelio.
        </Text>
      </View>

      <View className="mt-4 flex-row gap-2">
        {([["active", "Aktivni"], ["history", "Istorija"]] as const).map(([key, label]) => {
          const on = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              className="rounded-full border px-4 py-2"
              style={{
                borderColor: on ? theme.accent.primary : theme.surface.border,
                backgroundColor: on ? theme.accent.primary : "transparent"
              }}
            >
              <Text className="text-sm font-semibold" style={{ color: on ? "#fff" : theme.text.secondary }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 24 }} /> : null}

      {failed ? (
        <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
          <Text className="font-semibold text-red-700 dark:text-red-300">Greška pri učitavanju zadataka</Text>
          <Text className="mt-1 text-xs text-red-600 dark:text-red-400">
            {failure instanceof Error ? failure.message : "Nepoznata greška."}
          </Text>
          <Pressable onPress={() => retry()} className="mt-2 self-start rounded-lg border px-3 py-1.5" style={{ borderColor: theme.surface.border }}>
            <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>Pokušaj ponovo</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !failed && !visible.length ? (
        <View className="mt-4 rounded-2xl border border-dashed p-4" style={{ borderColor: theme.surface.border }}>
          <Text className="text-sm" style={{ color: theme.text.secondary }}>
            {isHistory
              ? "Još nema završenih zadataka."
              : "Nemaš aktivnih zadataka. Dispečer ti ih dodeljuje na webu."}
          </Text>
        </View>
      ) : null}

      <View className="mt-4 gap-3">
        {visible.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            theme={theme}
            busy={pendingId === task.id}
            readOnly={isHistory}
            onStart={() => setStatus(task, "IN_PROGRESS")}
            onDone={() => setStatus(task, "DONE")}
          />
        ))}
      </View>

      {isHistory && history.hasNextPage ? (
        <Pressable
          onPress={() => history.fetchNextPage()}
          disabled={history.isFetchingNextPage}
          className="mt-3 rounded-xl border px-4 py-3 disabled:opacity-60"
          style={{ borderColor: theme.surface.border }}
        >
          <Text className="text-center text-sm font-semibold" style={{ color: theme.text.secondary }}>
            {history.isFetchingNextPage ? "Učitavanje..." : "Učitaj još"}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function TaskCard({
  task,
  theme,
  busy,
  readOnly,
  onStart,
  onDone
}: {
  task: WorkTask;
  theme: AppTheme;
  busy: boolean;
  readOnly: boolean;
  onStart: () => void;
  onDone: () => void;
}) {
  const status = statusMeta(theme, task.status);
  const vehicle = [task.vehicleReg, task.trailerReg].filter(Boolean).join(" · ");

  return (
    <View className="rounded-2xl border p-4" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: theme.surface.subtle }}>
            <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>{workTaskTypeLabel(task.type)}</Text>
          </View>
          <Text className="mt-2 text-base font-extrabold" style={{ color: theme.text.primary }}>
            {task.title ?? workTaskTypeLabel(task.type)}
          </Text>
        </View>
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: status.bg }}>
          <Text className="text-xs font-semibold" style={{ color: status.text }}>{status.label}</Text>
        </View>
      </View>

      {task.note ? (
        <Text className="mt-1.5 text-sm" style={{ color: theme.text.secondary }}>{task.note}</Text>
      ) : null}

      <View className="mt-2.5 gap-1">
        {task.date ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="time-outline" size={14} color={theme.text.muted} />
            <Text className="text-xs" style={{ color: theme.text.muted }}>
              {readOnly
                ? task.completedAt
                  ? `Završeno ${formatDateTime(task.completedAt)}`
                  : formatDate(task.date)
                : formatDateTime(task.date)}
            </Text>
          </View>
        ) : null}
        {task.locationName ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="location-outline" size={14} color={theme.text.muted} />
            <Text className="text-xs" style={{ color: theme.text.muted }}>{task.locationName}</Text>
          </View>
        ) : null}
        {vehicle ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="bus-outline" size={14} color={theme.text.muted} />
            <Text className="text-xs" style={{ color: theme.text.muted }}>{vehicle}</Text>
          </View>
        ) : null}
      </View>

      {readOnly ? null : (
      <View className="mt-3.5 flex-row gap-2">
        {task.status === "OPEN" ? (
          <Pressable
            onPress={onStart}
            disabled={busy}
            className="flex-1 rounded-xl border px-4 py-2.5 disabled:opacity-60"
            style={{ borderColor: theme.accent.primary }}
          >
            <Text className="text-center text-sm font-semibold" style={{ color: theme.accent.primary }}>Započni</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onDone}
          disabled={busy}
          className="flex-1 rounded-xl px-4 py-2.5 disabled:opacity-60"
          style={{ backgroundColor: theme.accent.primary }}
        >
          <Text className="text-center text-sm font-semibold text-white">{busy ? "Čuvanje..." : "Gotovo"}</Text>
        </Pressable>
      </View>
      )}
    </View>
  );
}
