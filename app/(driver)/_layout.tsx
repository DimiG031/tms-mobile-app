import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { Theme } from "@/lib/theme";

type IconProps = Readonly<{ color: string; size?: number }>;

function HomeIcon({ color, size }: IconProps) {
  return <Ionicons name="home-outline" size={size ?? 20} color={color} />;
}
function ToursIcon({ color, size }: IconProps) {
  return <Ionicons name="trail-sign-outline" size={size ?? 20} color={color} />;
}
function ChatIcon({ color, size }: IconProps) {
  return <Ionicons name="chatbubble-ellipses-outline" size={size ?? 20} color={color} />;
}
function NotificationsIcon({ color, size }: IconProps) {
  return <Ionicons name="notifications-outline" size={size ?? 20} color={color} />;
}
function ProfileIcon({ color, size }: IconProps) {
  return <Ionicons name="person-outline" size={size ?? 20} color={color} />;
}

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
        options={{ title: "Početna", tabBarIcon: HomeIcon }}
      />
      <Tabs.Screen
        name="tours"
        options={{ title: "Ture", tabBarIcon: ToursIcon }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: "Poruke", tabBarIcon: ChatIcon }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: "Obaveštenja", tabBarIcon: NotificationsIcon }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profil", tabBarIcon: ProfileIcon }}
      />
    </Tabs>
  );
}
