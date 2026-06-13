import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { ActivityIndicator, Alert, Linking, ScrollView } from "react-native";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useChatUsers } from "@/queries/useChat";
import { useMobileDriverProfile } from "@/queries/useMobileDriverProfile";
import { useMobileProfile } from "@/queries/useMobileProfile";
import { useTheme } from "@/providers/ThemeProvider";

type IconName = ComponentProps<typeof Ionicons>["name"];

type Contact = {
  id: string;
  name: string;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
};

function translateRole(role?: string | null): string {
  if (!role) return "";
  const normalized = role.toUpperCase();
  if (normalized === "DRIVER" || normalized === "USER") return "Vozač";
  if (normalized === "DISPATCHER") return "Dispečer";
  if (normalized === "ADMIN") return "Administrator";
  if (normalized === "MANAGER") return "Menadžer";
  if (normalized === "SUPERADMIN") return "Superadmin";
  return role;
}

async function openExternal(url: string, unavailableMessage: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Kontakt", unavailableMessage);
  }
}

function ActionButton({ icon, label, color, onPress }: Readonly<{ icon: IconName; label: string; color: string; onPress: () => void }>) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} className="flex-1 items-center rounded-xl border py-2.5" style={{ borderColor: theme.surface.border }}>
      <Ionicons name={icon} size={22} color={color} />
      <Text className="mt-1 text-[11px] font-semibold" style={{ color: theme.text.secondary }}>{label}</Text>
    </Pressable>
  );
}

function ContactCard({ contact }: Readonly<{ contact: Contact }>) {
  const theme = useTheme();
  const phone = contact.phone?.trim() || null;
  const email = contact.email?.trim() || null;
  const role = translateRole(contact.role);

  return (
    <View className="rounded-2xl border p-4" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
      <Text className="text-base font-extrabold" style={{ color: theme.text.primary }}>{contact.name}</Text>
      {role ? <Text className="mt-0.5 text-xs font-semibold uppercase" style={{ color: theme.accent.primary }}>{role}</Text> : null}
      {phone ? <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>{phone}</Text> : null}
      {email ? <Text className="mt-0.5 text-sm" style={{ color: theme.text.secondary }}>{email}</Text> : null}

      {!phone && !email ? (
        <Text className="mt-2 text-xs" style={{ color: theme.text.muted }}>Nema kontakt podataka.</Text>
      ) : (
        <View className="mt-3 flex-row gap-2" style={{ borderTopWidth: 1, borderTopColor: theme.surface.border, paddingTop: 12 }}>
          {phone ? (
            <>
              <ActionButton icon="call-outline" label="Poziv" color="#16a34a" onPress={() => void openExternal(`tel:${phone}`, "Pozivanje nije dostupno na ovom uređaju.")} />
              <ActionButton icon="chatbubble-ellipses-outline" label="Poruka" color={theme.accent.primary} onPress={() => void openExternal(`sms:${phone}`, "Slanje SMS-a nije dostupno.")} />
              <ActionButton icon="chatbubbles-outline" label="Viber" color="#7360f2" onPress={() => void openExternal(`viber://chat?number=${encodeURIComponent(phone)}`, "Viber nije instaliran na uređaju.")} />
            </>
          ) : null}
          {email ? (
            <ActionButton icon="mail-outline" label="Mejl" color="#2563eb" onPress={() => void openExternal(`mailto:${email}`, "Slanje mejla nije dostupno.")} />
          ) : null}
        </View>
      )}
    </View>
  );
}

export default function ProfileKontaktiScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const mobileProfileQuery = useMobileProfile();
  const driverId = mobileProfileQuery.data?.user.driverId ?? session?.user.driverId ?? null;
  const driverProfileQuery = useMobileDriverProfile(Boolean(driverId));
  const usersQuery = useChatUsers();

  const me: Contact | null = (() => {
    const driver = driverProfileQuery.data?.driver;
    const user = mobileProfileQuery.data?.user ?? driverProfileQuery.data?.user ?? session?.user;
    if (!user) return null;
    return {
      id: user.id,
      name: driver?.name ?? user.name ?? "Ja",
      role: user.role,
      phone: driver?.phone ?? driverProfileQuery.data?.user.phone ?? mobileProfileQuery.data?.driver?.phone ?? null,
      email: user.email
    };
  })();

  const colleagues: Contact[] = (usersQuery.data ?? [])
    .filter((user) => user.id !== session?.user.id)
    .map((user) => ({ id: user.id, name: user.name, role: user.role, phone: user.phone ?? null, email: user.email }));

  const isLoading = usersQuery.isLoading || (Boolean(driverId) && driverProfileQuery.isLoading);

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: theme.surface.app }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Kontakti" }} />
      <Text className="text-3xl font-extrabold" style={{ color: theme.text.primary }}>Kontakti</Text>
      <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>Pozovi, pošalji poruku, Viber ili mejl jednim dodirom.</Text>

      {isLoading ? <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 24 }} /> : null}
      {usersQuery.isError ? <Text className="mt-4 text-red-600">Greška pri učitavanju kontakata.</Text> : null}

      {me ? (
        <>
          <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: theme.text.secondary }}>Moj kontakt</Text>
          <ContactCard contact={me} />
        </>
      ) : null}

      <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: theme.text.secondary }}>Tim i kolege</Text>
      {colleagues.length ? (
        <View className="gap-2">
          {colleagues.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </View>
      ) : (
        !isLoading ? (
          <View className="rounded-2xl border border-dashed p-4" style={{ borderColor: theme.surface.border }}>
            <Text className="text-sm" style={{ color: theme.text.secondary }}>Nema dostupnih kontakata.</Text>
          </View>
        ) : null
      )}
    </ScrollView>
  );
}
