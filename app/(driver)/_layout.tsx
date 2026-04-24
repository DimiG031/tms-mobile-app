import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { Theme } from "@/lib/theme";

export default function DriverLayout() {
  const { session } = useAuth();

  if (!session?.user.driverId) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Theme.accent.primary,
        tabBarInactiveTintColor: Theme.text.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600"
        },
        tabBarStyle: {
          backgroundColor: Theme.surface.card,
          borderTopColor: Theme.surface.border
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Pocetna",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size ?? 20} color={color} />
        }}
      />
      <Tabs.Screen
        name="tours"
        options={{
          title: "Ture",
          tabBarIcon: ({ color, size }) => <Ionicons name="trail-sign-outline" size={size ?? 20} color={color} />
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: "Poruke",
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size ?? 20} color={color} />
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Obavestenja",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size ?? 20} color={color} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size ?? 20} color={color} />
        }}
      />

      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="chat/new" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
    </Tabs>
  );
}
