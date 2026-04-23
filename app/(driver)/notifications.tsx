import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Pressable, Text, View } from "@/components/ui";
import type { AppNotification } from "@/lib/types";
import { formatDateTime, translateSeverity } from "@/lib/formatters";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsInfinite
} from "@/queries/useNotifications";
import { resolveNotificationRoute } from "@/services/notifications";

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
  const [markingId, setMarkingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    }, [queryClient])
  );

  const items = useMemo(
    () => notificationsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [notificationsQuery.data?.pages]
  );

  const onOpenNotification = async (notification: AppNotification) => {
    if (!notification.isRead) {
      try {
        setMarkingId(notification.id);
        await markRead.mutateAsync(notification.id);
      } catch {
        // Continue navigation even if mark-read fails.
      } finally {
        setMarkingId(null);
      }
    }

    const route = resolveNotificationRoute({
      actionUrl: notification.actionUrl,
      notificationId: notification.id,
      tourId: notification.metadata?.tourId,
      metadata: notification.metadata
    });
    router.push(route as never);
  };

  const onMarkAsRead = (id: string) => {
    setMarkingId(id);
    markRead.mutate(id, {
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Azuriranje obavestenja nije uspelo.";
        Alert.alert("Obavestenja", message);
      },
      onSettled: () => {
        setMarkingId(null);
      }
    });
  };

  const onMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Oznacavanje svih obavestenja nije uspelo.";
        Alert.alert("Obavestenja", message);
      }
    });
  };

  return (
    <View className="flex-1 bg-white px-4 py-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-slate-900">Obavestenja</Text>
        <Pressable
          onPress={onMarkAllRead}
          disabled={markAllRead.isPending || !items.some((item) => !item.isRead)}
          className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-60"
        >
          <Text className="text-xs font-semibold text-slate-700">
            {markAllRead.isPending ? "Azuriranje..." : "Oznaci sve"}
          </Text>
        </Pressable>
      </View>

      {notificationsQuery.isError ? (
        <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <Text className="text-red-700">Ucitavanje obavestenja nije uspelo.</Text>
          <Pressable onPress={() => void notificationsQuery.refetch()} className="mt-2 self-start rounded-lg border border-red-300 px-3 py-2">
            <Text className="text-red-700">Pokusaj ponovo</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 32, flexGrow: items.length ? 0 : 1 }}
        refreshControl={
          <RefreshControl
            refreshing={notificationsQuery.isRefetching}
            onRefresh={() => {
              void notificationsQuery.refetch();
            }}
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
            className={`mb-3 rounded-xl border p-3 ${severityClass(item.severity)} ${item.isRead ? "opacity-80" : "opacity-100"}`}
          >
            <Text className="font-semibold text-slate-900">{item.title}</Text>
            <Text className="mt-1 text-sm text-slate-700">{item.message}</Text>
            <Text className="mt-2 text-xs uppercase text-slate-500">{translateSeverity(item.severity)}</Text>
            <Text className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt)}</Text>

            {!item.isRead ? (
              <Pressable
                onPress={() => onMarkAsRead(item.id)}
                disabled={markRead.isPending && markingId === item.id}
                className="mt-3 self-start rounded-lg border border-brand-500 px-3 py-2 disabled:opacity-60"
              >
                <Text className="text-xs font-semibold text-brand-600">
                  {markRead.isPending && markingId === item.id ? "Azuriranje..." : "Oznaci kao procitano"}
                </Text>
              </Pressable>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          !notificationsQuery.isLoading ? (
            <View className="flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6">
              <Text className="text-center text-slate-600">Nemate obavestenja.</Text>
            </View>
          ) : (
            <Text className="text-slate-500">Ucitavanje...</Text>
          )
        }
        ListFooterComponent={
          notificationsQuery.isFetchingNextPage ? (
            <Text className="pb-2 pt-1 text-center text-slate-500">Ucitavanje jos...</Text>
          ) : null
        }
      />
    </View>
  );
}
