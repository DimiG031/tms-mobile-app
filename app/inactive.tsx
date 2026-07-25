import { useState } from "react";
import { ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";

export default function InactiveScreen() {
  const theme = useTheme();
  const { signOut, recheckActivation, session } = useAuth();
  const [checking, setChecking] = useState(false);

  async function onRefresh() {
    setChecking(true);
    try {
      await recheckActivation();
    } finally {
      setChecking(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: theme.surface.app }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <View className="h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: theme.accent.primaryLight }}>
        <Ionicons name="lock-closed-outline" size={40} color={theme.accent.primary} />
      </View>

      <Text className="mt-6 text-center text-2xl font-extrabold" style={{ color: theme.text.primary }}>
        Nalog je neaktivan
      </Text>
      <Text className="mt-3 text-center text-base leading-6" style={{ color: theme.text.secondary }}>
        Vaš nalog je trenutno zamrznut. Obratite se administratoru firme za aktivaciju, pa pokušajte ponovo.
      </Text>
      {session?.user.email ? (
        <Text className="mt-2 text-center text-sm" style={{ color: theme.text.muted }}>
          {session.user.email}
        </Text>
      ) : null}

      <Pressable
        onPress={() => void onRefresh()}
        disabled={checking}
        className="mt-8 w-full flex-row items-center justify-center gap-2 rounded-xl px-4 py-3 disabled:opacity-60"
        style={{ backgroundColor: theme.accent.primary }}
      >
        {checking ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="refresh" size={18} color="#fff" />
        )}
        <Text className="text-center text-base font-semibold text-white">
          {checking ? "Provera..." : "Osveži"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => void signOut()}
        className="mt-3 w-full rounded-xl border px-4 py-3"
        style={{ borderColor: theme.surface.border }}
      >
        <Text className="text-center text-base font-semibold" style={{ color: theme.text.secondary }}>
          Odjavi se
        </Text>
      </Pressable>
    </View>
  );
}
