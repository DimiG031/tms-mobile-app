import { Pressable, Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useDriverProfile } from "@/queries/useDriverProfile";
import { Theme } from "@/lib/theme";

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { data } = useDriverProfile(session?.user.driverId);

  return (
    <View className="flex-1" style={{ backgroundColor: Theme.surface.app }}>
      <View className="rounded-b-3xl px-4 pb-7 pt-6" style={{ backgroundColor: Theme.accent.primary }}>
        <Text className="text-center text-3xl font-extrabold" style={{ color: Theme.text.inverse }}>
          {data?.name ?? session?.user.name ?? "Vozac"}
        </Text>
        <Text className="mt-1 text-center text-base" style={{ color: "rgba(255,255,255,0.88)" }}>
          {session?.user.role ?? "USER"} - Transport
        </Text>
      </View>

      <View className="px-4 py-4">
        <View className="rounded-2xl border px-4 py-3" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
          <Text className="text-slate-500">Ime i prezime</Text>
          <Text className="font-semibold text-slate-900">{data?.name ?? session?.user.name ?? "-"}</Text>

          <Text className="mt-3 text-slate-500">Email</Text>
          <Text className="font-semibold text-slate-900">{session?.user.email ?? "-"}</Text>

          <Text className="mt-3 text-slate-500">Telefon</Text>
          <Text className="font-semibold text-slate-900">{data?.phone ?? "-"}</Text>

          <Text className="mt-3 text-slate-500">Vazi dozvola do</Text>
          <Text className="font-semibold text-slate-900">{data?.licenseExpiry ?? "-"}</Text>
        </View>

        <Pressable
          onPress={() => void signOut()}
          className="mt-4 rounded-xl border px-4 py-3"
          style={{ borderColor: "#fca5a5" }}
        >
          <Text className="text-center font-semibold" style={{ color: "#dc2626" }}>
            Odjavi se
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
