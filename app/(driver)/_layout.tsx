import { Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useUnreadNotificationsCount } from "@/queries/useNotifications";
import { useChatThreads } from "@/queries/useChat";
import { OfflineBanner } from "@/components/OfflineBanner";

function isSuperAdminRole(role: string | null | undefined): boolean {
  return (role ?? "").toUpperCase() === "SUPERADMIN";
}

export default function DriverLayout() {
  const { session } = useAuth();
  const { data: unreadCount } = useUnreadNotificationsCount();
  const { data: chatThreads } = useChatThreads();
  const unreadChatCount = (chatThreads ?? []).filter((thread) => thread.hasUnread).length;

  const canAccessDriverArea = Boolean(session?.user.driverId) || isSuperAdminRole(session?.user.role);
  if (!canAccessDriverArea) {
    return null;
  }

  return (
    <>
      <SafeAreaView edges={["top"]} className="bg-white">
        <OfflineBanner />
      </SafeAreaView>
      <Tabs
        screenOptions={{
          headerTitleAlign: "center",
          tabBarActiveTintColor: "#0f766e",
          tabBarInactiveTintColor: "#64748b",
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
          tabBarIconStyle: { marginTop: 2 }
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Pocetna" }} />
        <Tabs.Screen name="tours" options={{ title: "Ture", headerShown: false }} />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Poruke",
            headerShown: false,
            tabBarBadge: unreadChatCount > 0 ? unreadChatCount : undefined,
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 14 }}>💬</Text>
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: "Obavestenja",
            tabBarBadge: unreadCount && unreadCount > 0 ? unreadCount : undefined
          }}
        />
        <Tabs.Screen name="profile" options={{ title: "Profil" }} />
      </Tabs>
    </>
  );
}
