import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Pressable, Text, View } from "@/components/ui";
import type { AppNotification } from "@/lib/types";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsInfinite
} from "@/queries/useNotifications";
import { resolveNotificationRoute, withNotificationSource } from "@/services/notifications";
import { formatSrDateTime } from "@/lib/theme";
import { useTheme } from "@/providers/ThemeProvider";

function severityClass(severity: AppNotification["severity"]): string {
  if (severity === "critical") return "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950";
  if (severity === "warning") return "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950";
  return "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950";
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const notificationsQuery = useNotificationsInfinite(20);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    }, [queryClient])
  );

  const items = useMemo(
    () => notificationsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [notificationsQuery.data?.pages]
  );

  async function onRefresh() {
    setIsRefreshing(true);
    try {
      await notificationsQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function onOpenNotification(notification: AppNotification) {
    if (!notification.isRead) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        // Navigacija treba da radi i ako backend trenutno odbije mark-read.
      }
    }

    const route = withNotificationSource(resolveNotificationRoute({
      actionUrl: notification.actionUrl,
      notificationId: notification.id,
      metadata: notification.metadata,
      threadId: notification.metadata?.threadId,
      tourId: notification.metadata?.tourId
    }));
    router.push(route as never);
  }

  function onMarkAsRead(id: string) {
    setPendingNotificationId(id);
    markRead.mutate(id, {
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Ažuriranje obaveštenja nije uspelo.";
        Alert.alert("Obaveštenja", message);
      },
      onSettled: () => {
        setPendingNotificationId((current) => (current === id ? null : current));
      }
    });
  }

  function onMarkAllRead() {
    markAllRead.mutate(undefined, {
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Označavanje svih obaveštenja nije uspelo.";
        Alert.alert("Obaveštenja", message);
      }
    });
  }

  const unread = items.filter((item) => !item.isRead).length;

  return (
    <View className="flex-1 px-4 py-5" style={{ backgroundColor: theme.surface.app }}>
      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-extrabold" style={{ color: theme.text.primary }}>
            Obaveštenja
          </Text>
          <Text className="text-sm" style={{ color: theme.text.secondary }}>
            {unread} nepročitanih
          </Text>
        </View>
        <Pressable
          onPress={onMarkAllRead}
          disabled={markAllRead.isPending}
          className="max-w-[132px] rounded-full px-3 py-2 disabled:opacity-60"
          style={{ borderColor: theme.accent.primary, borderWidth: 1, backgroundColor: theme.accent.primaryLight }}
        >
          <Text className="text-center text-xs font-semibold" style={{ color: theme.accent.primaryDark }}>
            {markAllRead.isPending ? "Ažuriranje..." : "Označi sve kao pročitano"}
          </Text>
        </Pressable>
      </View>

      {notificationsQuery.isLoading ? <Text className="text-slate-500 dark:text-slate-400">Učitavanje...</Text> : null}
      {notificationsQuery.isError ? <Text className="text-red-600">Učitavanje obaveštenja nije uspelo.</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={theme.accent.primary}
            colors={[theme.accent.primary]}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (notificationsQuery.hasNextPage && !notificationsQuery.isFetchingNextPage) {
            void notificationsQuery.fetchNextPage();
          }
        }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void onOpenNotification(item)}
            className={`mb-3 rounded-2xl border p-3 ${severityClass(item.severity)} ${item.isRead ? "opacity-80" : "opacity-100"}`}
          >
            <View className="flex-row items-start justify-between gap-2">
              <Text className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">{formatSrDateTime(item.createdAt)}</Text>
            </View>
            <Text className="mt-1 text-sm text-slate-700 dark:text-slate-300">{item.message}</Text>
            {item.isRead ? null : (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  onMarkAsRead(item.id);
                }}
                disabled={pendingNotificationId === item.id}
                className="mt-3 self-start rounded-lg px-3 py-2 disabled:opacity-60"
                style={{ borderColor: theme.accent.primary, borderWidth: 1 }}
              >
                <Text className="text-xs font-semibold" style={{ color: theme.accent.primary }}>
                  {pendingNotificationId === item.id ? "Ažuriranje..." : "Označi kao pročitano"}
                </Text>
              </Pressable>
            )}
          </Pressable>
        )}
        ListEmptyComponent={notificationsQuery.isLoading ? null : <Text className="text-slate-500 dark:text-slate-400">Nema obaveštenja.</Text>}
        ListFooterComponent={
          notificationsQuery.isFetchingNextPage
            ? <Text className="pb-2 pt-1 text-center text-slate-500 dark:text-slate-400">Učitavanje još...</Text>
            : null
        }
      />
    </View>
  );
}
