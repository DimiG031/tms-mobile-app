import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Pressable, Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useMobileDriverProfile } from "@/queries/useMobileDriverProfile";
import { useMobileProfile } from "@/queries/useMobileProfile";
import { useTheme } from "@/providers/ThemeProvider";
import { countUrgentDeadlines } from "@/lib/deadlines";

type IconName = ComponentProps<typeof Ionicons>["name"];

function translateRole(role?: string | null): string {
  if (!role) return "Korisnik";
  const normalized = role.toUpperCase();
  if (normalized === "DRIVER" || normalized === "USER") return "Vozač";
  if (normalized === "DISPATCHER") return "Dispečer";
  if (normalized === "ADMIN") return "Administrator";
  if (normalized === "MANAGER") return "Menadžer";
  if (normalized === "SUPERADMIN") return "Superadmin";
  return role;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function SectionHeader({ title }: Readonly<{ title: string }>) {
  const theme = useTheme();
  return (
    <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: theme.text.secondary }}>
      {title}
    </Text>
  );
}

function InfoRow({ label, value, isLast = false }: Readonly<{ label: string; value?: string | null; isLast?: boolean }>) {
  const theme = useTheme();
  return (
    <View className="py-3" style={isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: theme.surface.border }}>
      <Text className="mb-0.5 text-xs" style={{ color: theme.text.secondary }}>{label}</Text>
      <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>{value || "Nije uneto"}</Text>
    </View>
  );
}

function Card({ children }: Readonly<{ children: ReactNode }>) {
  const theme = useTheme();
  return (
    <View className="overflow-hidden rounded-2xl border px-4" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
      {children}
    </View>
  );
}

function HubCard({
  href,
  icon,
  title,
  subtitle,
  badge,
  isFirst = false
}: Readonly<{ href: string; icon: IconName; title: string; subtitle: string; badge?: number; isFirst?: boolean }>) {
  const theme = useTheme();
  return (
    <Link href={href as "./"} asChild>
      <Pressable
        className={`${isFirst ? "" : "mt-2 "}rounded-2xl border px-4 py-4`}
        style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}
      >
        <View className="flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: theme.accent.primaryLight }}>
            <Ionicons name={icon} size={22} color={theme.accent.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold" style={{ color: theme.text.primary }}>{title}</Text>
            <Text className="mt-0.5 text-xs" style={{ color: theme.text.secondary }}>{subtitle}</Text>
          </View>
          {badge && badge > 0 ? (
            <View className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 dark:bg-amber-950">
              <Text className="text-xs font-bold text-amber-800 dark:text-amber-300">{badge} ističu</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={theme.text.muted} />
        </View>
      </Pressable>
    </Link>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();
  const mobileProfileQuery = useMobileProfile();
  const driverId = mobileProfileQuery.data?.user.driverId ?? session?.user.driverId ?? null;
  const driverProfileQuery = useMobileDriverProfile(Boolean(driverId));
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function onRefresh() {
    setIsRefreshing(true);
    try {
      await Promise.all([
        mobileProfileQuery.refetch(),
        driverId ? driverProfileQuery.refetch() : Promise.resolve()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }

  const mobileProfile = mobileProfileQuery.data;
  const driverProfile = driverProfileQuery.data;
  const driver = driverProfile?.driver;
  const user = mobileProfile?.user ?? driverProfile?.user ?? session?.user;
  const company = mobileProfile?.company ?? driverProfile?.company ?? null;
  const displayName = driver?.name ?? mobileProfile?.driver?.name ?? user?.name ?? "Korisnik";
  const isLoading = mobileProfileQuery.isLoading || (Boolean(driverId) && driverProfileQuery.isLoading);
  const isError = mobileProfileQuery.isError || driverProfileQuery.isError;
  const error = mobileProfileQuery.error ?? driverProfileQuery.error;

  const urgentDeadlines = driver
    ? countUrgentDeadlines([
        driver.licenseValidTo,
        driver.medicalExamValidTo,
        driver.driverCardValid,
        driver.adrCertificate ? driver.adrValidTo : null,
        driver.cpcCertificate ? driver.cpcValidTo : null
      ])
    : 0;

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.surface.app }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void onRefresh()}
          tintColor={theme.accent.primary}
          colors={[theme.accent.primary]}
        />
      }
    >
      <View className="rounded-b-3xl px-4 pb-8 pt-10" style={{ backgroundColor: theme.accent.primary }}>
        <View className="mx-auto mb-3 h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
          <Text className="text-2xl font-bold" style={{ color: "#fff" }}>{initials(displayName)}</Text>
        </View>
        <Text className="text-center text-2xl font-extrabold" style={{ color: theme.text.inverse }}>{displayName}</Text>
        <Text className="mt-1 text-center text-sm" style={{ color: "rgba(255,255,255,0.80)" }}>
          {translateRole(user?.role)}
          {company?.name ? ` · ${company.name}` : ""}
        </Text>
      </View>

      <View className="px-4">
        {isLoading ? (
          <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 24 }} />
        ) : isError ? (
          <View className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950">
            <Text className="font-semibold text-red-700 dark:text-red-300">Greška pri učitavanju profila</Text>
            <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Pokušajte ponovo."}
            </Text>
            <Pressable onPress={() => void onRefresh()} className="mt-3 self-start rounded-lg border border-red-300 px-3 py-2 dark:border-red-800">
              <Text className="text-sm font-semibold text-red-700 dark:text-red-300">Pokušaj ponovo</Text>
            </Pressable>
          </View>
        ) : null}

        <View className="mt-5">
          <HubCard
            href="/(driver)/profile/rokovi"
            icon="alarm-outline"
            title="Rokovi i dokumenta"
            subtitle="Dozvola, kartica, lekarski i sertifikati."
            badge={urgentDeadlines}
            isFirst
          />
          <HubCard
            href="/(driver)/profile/stats"
            icon="stats-chart-outline"
            title="Moja statistika"
            subtitle="Vožnja, godišnji odmor i ugovor."
          />
          <HubCard
            href="/(driver)/profile/settings"
            icon="settings-outline"
            title="Podešavanja"
            subtitle="Navigacija, moduli, tema i bezbednost naloga."
          />
        </View>

        {user ? (
          <>
            <SectionHeader title="Osnovni podaci" />
            <Card>
              <InfoRow label="Ime i prezime" value={displayName} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Telefon" value={driver?.phone ?? driverProfile?.user.phone ?? mobileProfile?.driver?.phone ?? null} />
              <InfoRow label="Adresa" value={driver?.address ?? mobileProfile?.driver?.address ?? null} />
              <InfoRow label="Firma" value={company?.name} isLast />
            </Card>
          </>
        ) : null}

        <Pressable onPress={() => void signOut()} className="mt-6 rounded-xl border px-4 py-3" style={{ borderColor: "#fca5a5" }}>
          <Text className="text-center font-semibold" style={{ color: "#dc2626" }}>Odjavi se</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
