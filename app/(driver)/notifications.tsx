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
import { resolveNotificationRoute } from "@/services/notifications";
import { Theme, formatSrDateTime } from "@/lib/theme";

function severityClass(severity: AppNotification["severity"]): string {
  if (severity === "critical") return "border-red-300 bg-red-50";
  if (severity === "warning") return "border-amber-300 bg-amber-50";
  return "border-blue-200 bg-blue-50";
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const notificationsQuery = useNotificationsInfinite(20);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const onOpenNotification = async (notification: AppNotification) => {
    if (!notification.isRead) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        // Continue navigation even if mark-read fails.
      }
    }

    const route = resolveNotificationRoute({
      actionUrl: notification.actionUrl,
      notificationId: notification.id,
      tourId: notification.metadata?.tourId
    });
    router.push(route as never);
  };

  const onMarkAsRead = (id: string) => {
    markRead.mutate(id, {
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Ažuriranje obavještenja nije uspjelo.";
        Alert.alert("Obavještenja", message);
      }
    });
  };

  const onMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Označavanje svih obavještenja nije uspjelo.";
        Alert.alert("Obavještenja", message);
      }
    });
  };

  const unread = items.filter((item) => !item.isRead).length;

  return (
    <View className="flex-1 px-4 py-5" style={{ backgroundColor: Theme.surface.app }}>
      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-extrabold" style={{ color: Theme.text.primary }}>
            Obavještenja
          </Text>
          <Text className="text-sm" style={{ color: Theme.text.secondary }}>
            {unread} nepročitana
          </Text>
        </View>
        <Pressable
          onPress={onMarkAllRead}
          disabled={markAllRead.isPending}
          className="rounded-full px-3 py-2 disabled:opacity-60"
          style={{ borderColor: Theme.accent.primary, borderWidth: 1, backgroundColor: Theme.accent.primaryLight }}
        >
          <Text className="text-xs font-semibold" style={{ color: Theme.accent.primaryDark }}>
            {markAllRead.isPending ? "Ažuriranje..." : "Označi sve"}
          </Text>
        </Pressable>
      </View>

      {notificationsQuery.isLoading ? <Text className="text-slate-500">Učitavanje...</Text> : null}
      {notificationsQuery.isError ? <Text className="text-red-600">Učitavanje obavještenja nije uspjelo.</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={Theme.accent.primary}
            colors={[Theme.accent.primary]}
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
              <Text className="font-semibold text-slate-900">{item.title}</Text>
              <Text className="text-xs text-slate-500">{formatSrDateTime(item.createdAt)}</Text>
            </View>
            <Text className="mt-1 text-sm text-slate-700">{item.message}</Text>
            {item.isRead ? null : (
              <Pressable
                onPress={() => onMarkAsRead(item.id)}
                disabled={markRead.isPending}
                className="mt-3 self-start rounded-lg px-3 py-2"
                style={{ borderColor: Theme.accent.primary, borderWidth: 1 }}
              >
                <Text className="text-xs font-semibold" style={{ color: Theme.accent.primary }}>
                  {markRead.isPending ? "Ažuriranje..." : "Označi kao pročitano"}
                </Text>
              </Pressable>
            )}
          </Pressable>
        )}
        ListEmptyComponent={notificationsQuery.isLoading ? null : <Text className="text-slate-500">Nema obavještenja.</Text>}
        ListFooterComponent={
          notificationsQuery.isFetchingNextPage
            ? <Text className="pb-2 pt-1 text-center text-slate-500">Učitavanje još...</Text>
            : null
        }
      />
    </View>
  );
}
