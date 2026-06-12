import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useMobileDriverProfile } from "@/queries/useMobileDriverProfile";
import { useMobileProfile } from "@/queries/useMobileProfile";
import { getModuleDefinition } from "@/lib/mobile-modules";
import { Theme } from "@/lib/theme";
import { formatDate } from "@/lib/formatters";

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
  return (
    <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: Theme.text.secondary }}>
      {title}
    </Text>
  );
}

function InfoRow({ label, value, isLast = false }: Readonly<{ label: string; value?: string | null; isLast?: boolean }>) {
  return (
    <View className="py-3" style={isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: Theme.surface.border }}>
      <Text className="mb-0.5 text-xs" style={{ color: Theme.text.secondary }}>{label}</Text>
      <Text className="text-sm font-semibold" style={{ color: Theme.text.primary }}>{value || "Nije uneto"}</Text>
    </View>
  );
}

function CertRow({ label, active, validTo, isLast = false }: Readonly<{ label: string; active: boolean; validTo?: string | null; isLast?: boolean }>) {
  return (
    <View className="flex-row items-center justify-between py-3" style={isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: Theme.surface.border }}>
      <Text className="text-sm" style={{ color: Theme.text.secondary }}>{label}</Text>
      <View className="items-end">
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: active ? "#d1fae5" : "#f1f5f9" }}>
          <Text className="text-xs font-semibold" style={{ color: active ? "#065f46" : "#64748b" }}>
            {active ? "Aktivan" : "Neaktivan"}
          </Text>
        </View>
        {active && validTo ? (
          <Text className="mt-1 text-xs" style={{ color: Theme.text.secondary }}>do {formatDate(validTo)}</Text>
        ) : null}
      </View>
    </View>
  );
}

function Card({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <View className="overflow-hidden rounded-2xl border px-4" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
      {children}
    </View>
  );
}

const ROK_WARN_DAYS = 30;

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

function rokStatus(days: number | null): { label: string; bg: string; text: string } {
  if (days === null) return { label: "Nije uneto", bg: "#f1f5f9", text: "#64748b" };
  if (days < 0) return { label: "Istekao", bg: "#fee2e2", text: "#b91c1c" };
  if (days === 0) return { label: "Ističe danas", bg: "#fee2e2", text: "#b91c1c" };
  if (days <= ROK_WARN_DAYS) return { label: `Ističe za ${days} d.`, bg: "#fef3c7", text: "#92400e" };
  return { label: `Još ${days} d.`, bg: "#d1fae5", text: "#065f46" };
}

type Deadline = { label: string; date?: string | null };

function RokRow({ label, date, isLast = false }: Readonly<{ label: string; date?: string | null; isLast?: boolean }>) {
  const days = daysUntil(date);
  const status = rokStatus(days);
  return (
    <View className="flex-row items-center justify-between py-3" style={isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: Theme.surface.border }}>
      <View className="flex-1 pr-3">
        <Text className="text-sm font-semibold" style={{ color: Theme.text.primary }}>{label}</Text>
        <Text className="mt-0.5 text-xs" style={{ color: Theme.text.secondary }}>{date ? `do ${formatDate(date)}` : "Datum nije unet"}</Text>
      </View>
      <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: status.bg }}>
        <Text className="text-xs font-semibold" style={{ color: status.text }}>{status.label}</Text>
      </View>
    </View>
  );
}

function RokoviSection({ deadlines }: Readonly<{ deadlines: Deadline[] }>) {
  if (!deadlines.length) return null;
  const urgentCount = deadlines.filter((item) => {
    const days = daysUntil(item.date);
    return days !== null && days <= ROK_WARN_DAYS;
  }).length;

  return (
    <>
      <SectionHeader title="Rokovi i podsetnici" />
      {urgentCount > 0 ? (
        <View className="mb-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
          <Text className="text-sm font-semibold text-amber-800">
            {urgentCount === 1 ? "1 dokument ističe uskoro" : `${urgentCount} dokumenta uskoro ističu`}
          </Text>
          <Text className="mt-0.5 text-xs text-amber-700">Proveri rokove ispod i obnovi na vreme.</Text>
        </View>
      ) : null}
      <Card>
        {deadlines.map((item, index) => (
          <RokRow key={item.label} label={item.label} date={item.date} isLast={index === deadlines.length - 1} />
        ))}
      </Card>
    </>
  );
}

export default function ProfileScreen() {
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

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: Theme.surface.app }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void onRefresh()}
          tintColor={Theme.accent.primary}
          colors={[Theme.accent.primary]}
        />
      }
    >
      <View className="rounded-b-3xl px-4 pb-8 pt-10" style={{ backgroundColor: Theme.accent.primary }}>
        <View className="mx-auto mb-3 h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
          <Text className="text-2xl font-bold" style={{ color: "#fff" }}>{initials(displayName)}</Text>
        </View>
        <Text className="text-center text-2xl font-extrabold" style={{ color: Theme.text.inverse }}>{displayName}</Text>
        <Text className="mt-1 text-center text-sm" style={{ color: "rgba(255,255,255,0.80)" }}>
          {translateRole(user?.role)}
          {company?.name ? ` · ${company.name}` : ""}
        </Text>
      </View>

      <View className="px-4">
        {isLoading ? (
          <ActivityIndicator color={Theme.accent.primary} style={{ marginVertical: 24 }} />
        ) : isError ? (
          <View className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <Text className="font-semibold text-red-700">Greška pri učitavanju profila</Text>
            <Text className="mt-1 text-sm text-red-600">
              {error instanceof Error ? error.message : "Pokušajte ponovo."}
            </Text>
            <Pressable onPress={() => void onRefresh()} className="mt-3 self-start rounded-lg border border-red-300 px-3 py-2">
              <Text className="text-sm font-semibold text-red-700">Pokušaj ponovo</Text>
            </Pressable>
          </View>
        ) : null}

        <SectionHeader title="Podešavanja" />
        <Link href="/(driver)/profile/settings" asChild>
          <Pressable className="rounded-2xl border px-4 py-4" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: Theme.accent.primaryLight }}>
                <Ionicons name="settings-outline" size={22} color={Theme.accent.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold" style={{ color: Theme.text.primary }}>Podešavanja profila</Text>
                <Text className="mt-0.5 text-xs" style={{ color: Theme.text.secondary }}>
                  Navigacija, moduli, tema i bezbednost naloga.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Theme.text.muted} />
            </View>
          </Pressable>
        </Link>

        {driver ? (
          <RokoviSection
            deadlines={[
              { label: "Vozačka dozvola", date: driver.licenseValidTo },
              { label: "Lekarski pregled", date: driver.medicalExamValidTo },
              { label: "Tahograf kartica", date: driver.driverCardValid },
              ...(driver.adrCertificate ? [{ label: "ADR sertifikat", date: driver.adrValidTo }] : []),
              ...(driver.cpcCertificate ? [{ label: "CPC sertifikat", date: driver.cpcValidTo }] : [])
            ]}
          />
        ) : null}

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

        {mobileProfile ? (
          <>
            <SectionHeader title="Mobilni interfejs" />
            <Card>
              <InfoRow label="Dozvoljeni moduli" value={mobileProfile.availableMobileModules.map((key) => getModuleDefinition(key).label).join(", ")} />
              <InfoRow label="Izabrani moduli" value={mobileProfile.preferences.selectedModules.map((key) => getModuleDefinition(key).label).join(", ")} />
              <InfoRow label="Točak navigacije" value={mobileProfile.preferences.sliceNavigationEnabled ? "Uključen" : "Isključen"} isLast />
            </Card>
          </>
        ) : null}

        {driver ? (
          <>
            <SectionHeader title="Vozačka dozvola" />
            <Card>
              <InfoRow label="Broj dozvole" value={driver.licenseNumber} />
              <InfoRow label="Kategorija" value={driver.licenseCategory} />
              <InfoRow label="Važi do" value={formatDate(driver.licenseValidTo)} isLast />
            </Card>

            <SectionHeader title="Lekarski pregled" />
            <Card>
              <InfoRow label="Datum pregleda" value={formatDate(driver.medicalExamDate)} />
              <InfoRow label="Važi do" value={formatDate(driver.medicalExamValidTo)} isLast />
            </Card>

            <SectionHeader title="Tahografska kartica" />
            <Card>
              <InfoRow label="ID kartice" value={driver.driverCardId} />
              <InfoRow label="Kartica važi do" value={formatDate(driver.driverCardValid)} isLast />
            </Card>

            <SectionHeader title="Sertifikati" />
            <Card>
              <CertRow label="ADR" active={driver.adrCertificate} validTo={driver.adrValidTo} />
              <CertRow label="CPC" active={driver.cpcCertificate} validTo={driver.cpcValidTo} isLast />
            </Card>

            {driver.notes ? (
              <>
                <SectionHeader title="Beleške" />
                <Card>
                  <Text className="py-3 text-sm leading-relaxed" style={{ color: Theme.text.primary }}>{driver.notes}</Text>
                </Card>
              </>
            ) : null}
          </>
        ) : null}

        <Pressable onPress={() => void signOut()} className="mt-6 rounded-xl border px-4 py-3" style={{ borderColor: "#fca5a5" }}>
          <Text className="text-center font-semibold" style={{ color: "#dc2626" }}>Odjavi se</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
