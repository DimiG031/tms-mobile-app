import { Stack } from "expo-router";
import { ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { useState, type ReactNode } from "react";
import { Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useMobileDriverProfile } from "@/queries/useMobileDriverProfile";
import { useMobileProfile } from "@/queries/useMobileProfile";
import { useTheme } from "@/providers/ThemeProvider";
import { formatDate } from "@/lib/formatters";
import { ROK_WARN_DAYS, countUrgentDeadlines, daysUntil, rokStatus } from "@/lib/deadlines";

type Deadline = { label: string; date?: string | null };

function SectionHeader({ title }: Readonly<{ title: string }>) {
  const theme = useTheme();
  return (
    <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: theme.text.secondary }}>
      {title}
    </Text>
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

function InfoRow({ label, value, isLast = false }: Readonly<{ label: string; value?: string | null; isLast?: boolean }>) {
  const theme = useTheme();
  return (
    <View className="py-3" style={isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: theme.surface.border }}>
      <Text className="mb-0.5 text-xs" style={{ color: theme.text.secondary }}>{label}</Text>
      <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>{value || "Nije uneto"}</Text>
    </View>
  );
}

function CertRow({ label, active, validTo, isLast = false }: Readonly<{ label: string; active: boolean; validTo?: string | null; isLast?: boolean }>) {
  const theme = useTheme();
  return (
    <View className="flex-row items-center justify-between py-3" style={isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: theme.surface.border }}>
      <Text className="text-sm" style={{ color: theme.text.secondary }}>{label}</Text>
      <View className="items-end">
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: active ? "#d1fae5" : (theme.isDark ? "#1e293b" : "#f1f5f9") }}>
          <Text className="text-xs font-semibold" style={{ color: active ? "#065f46" : theme.text.secondary }}>
            {active ? "Aktivan" : "Neaktivan"}
          </Text>
        </View>
        {active && validTo ? (
          <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>do {formatDate(validTo)}</Text>
        ) : null}
      </View>
    </View>
  );
}

function RokRow({ label, date, isLast = false }: Readonly<{ label: string; date?: string | null; isLast?: boolean }>) {
  const theme = useTheme();
  const status = rokStatus(daysUntil(date), theme.isDark);
  return (
    <View className="flex-row items-center justify-between py-3" style={isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: theme.surface.border }}>
      <View className="flex-1 pr-3">
        <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>{label}</Text>
        <Text className="mt-0.5 text-xs" style={{ color: theme.text.secondary }}>{date ? `do ${formatDate(date)}` : "Datum nije unet"}</Text>
      </View>
      <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: status.bg }}>
        <Text className="text-xs font-semibold" style={{ color: status.text }}>{status.label}</Text>
      </View>
    </View>
  );
}

export default function ProfileRokoviScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const mobileProfileQuery = useMobileProfile();
  const driverId = mobileProfileQuery.data?.user.driverId ?? session?.user.driverId ?? null;
  const driverProfileQuery = useMobileDriverProfile(Boolean(driverId));
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function onRefresh() {
    setIsRefreshing(true);
    try {
      await (driverId ? driverProfileQuery.refetch() : Promise.resolve());
    } finally {
      setIsRefreshing(false);
    }
  }

  const driver = driverProfileQuery.data?.driver;
  const isLoading = Boolean(driverId) && driverProfileQuery.isLoading;

  const deadlines: Deadline[] = driver
    ? [
        { label: "Vozačka dozvola", date: driver.licenseValidTo },
        { label: "Lekarski pregled", date: driver.medicalExamValidTo },
        { label: "Tahograf kartica", date: driver.driverCardValid },
        ...(driver.adrCertificate ? [{ label: "ADR sertifikat", date: driver.adrValidTo }] : []),
        ...(driver.cpcCertificate ? [{ label: "CPC sertifikat", date: driver.cpcValidTo }] : [])
      ]
    : [];
  const urgentCount = countUrgentDeadlines(deadlines.map((item) => item.date));

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.surface.app }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => void onRefresh()} tintColor={theme.accent.primary} colors={[theme.accent.primary]} />
      }
    >
      <Stack.Screen options={{ title: "Rokovi i dokumenta" }} />
      <Text className="text-3xl font-extrabold" style={{ color: theme.text.primary }}>Rokovi i dokumenta</Text>
      <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>Rokovi isteka i podaci tvojih dokumenata.</Text>

      {isLoading ? <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 24 }} /> : null}

      {!isLoading && !driver ? (
        <View className="mt-5 rounded-2xl border border-dashed p-4" style={{ borderColor: theme.surface.border }}>
          <Text className="text-sm" style={{ color: theme.text.secondary }}>Nema dostupnih podataka o dokumentima.</Text>
        </View>
      ) : null}

      {driver ? (
        <>
          {urgentCount > 0 ? (
            <View className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
              <Text className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {urgentCount === 1 ? "1 dokument ističe uskoro" : `${urgentCount} dokumenta uskoro ističu`}
              </Text>
              <Text className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">Obnovi na vreme da izbegneš zastoj na putu.</Text>
            </View>
          ) : null}

          <SectionHeader title="Rokovi i podsetnici" />
          <Card>
            {deadlines.map((item, index) => (
              <RokRow key={item.label} label={item.label} date={item.date} isLast={index === deadlines.length - 1} />
            ))}
          </Card>

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
                <Text className="py-3 text-sm leading-relaxed" style={{ color: theme.text.primary }}>{driver.notes}</Text>
              </Card>
            </>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}
