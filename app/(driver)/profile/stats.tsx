import { Stack } from "expo-router";
import { ActivityIndicator, ScrollView } from "react-native";
import type { ReactNode } from "react";
import { Text, View } from "@/components/ui";
import { useMobileStats } from "@/queries/useMobileStats";
import { useTheme } from "@/providers/ThemeProvider";
import { formatDate } from "@/lib/formatters";

function formatKm(value?: number | null): string {
  if (!value || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 0 }).format(value);
}

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

function Row({ label, value, isLast = false }: Readonly<{ label: string; value?: string | null; isLast?: boolean }>) {
  const theme = useTheme();
  return (
    <View className="flex-row items-center justify-between py-3" style={isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: theme.surface.border }}>
      <Text className="flex-1 pr-3 text-sm" style={{ color: theme.text.secondary }}>{label}</Text>
      <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>{value || "—"}</Text>
    </View>
  );
}

function DeadlineRow({ label, date, daysLeft, isLast = false }: Readonly<{ label: string; date?: string | null; daysLeft?: number | null; isLast?: boolean }>) {
  const theme = useTheme();
  const tone =
    daysLeft == null
      ? { bg: theme.isDark ? "#1e293b" : "#f1f5f9", text: theme.text.secondary, label: "Nije uneto" }
      : daysLeft < 0
      ? { bg: "#fee2e2", text: "#b91c1c", label: "Istekao" }
      : daysLeft <= 30
      ? { bg: "#fef3c7", text: "#92400e", label: `Još ${daysLeft} d.` }
      : { bg: "#d1fae5", text: "#065f46", label: `Još ${daysLeft} d.` };

  return (
    <View className="flex-row items-center justify-between py-3" style={isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: theme.surface.border }}>
      <View className="flex-1 pr-3">
        <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>{label}</Text>
        <Text className="mt-0.5 text-xs" style={{ color: theme.text.secondary }}>{date ? `do ${formatDate(date)}` : "Datum nije unet"}</Text>
      </View>
      <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: tone.bg }}>
        <Text className="text-xs font-semibold" style={{ color: tone.text }}>{tone.label}</Text>
      </View>
    </View>
  );
}

export default function ProfileStatsScreen() {
  const theme = useTheme();
  const { data: stats, isLoading, isError } = useMobileStats();

  const employee = stats?.employee;
  const leave = stats?.leave;
  const documents = stats?.documents;
  const driving = stats?.driving;

  const hasAny = Boolean(employee || leave || documents || driving);

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: theme.surface.app }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Moja statistika" }} />
      <Text className="text-3xl font-extrabold" style={{ color: theme.text.primary }}>Moja statistika</Text>
      <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>Tvoj radni pregled, odmor i rokovi.</Text>

      {isLoading ? <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 24 }} /> : null}
      {isError ? <Text className="mt-5 text-red-600">Greška pri učitavanju statistike.</Text> : null}

      {!isLoading && !isError && !hasAny ? (
        <View className="mt-5 rounded-2xl border border-dashed p-4" style={{ borderColor: theme.surface.border }}>
          <Text className="text-sm" style={{ color: theme.text.secondary }}>Nema dostupnih podataka za prikaz.</Text>
        </View>
      ) : null}

      {driving ? (
        <>
          <SectionHeader title="Vožnja" />
          <Card>
            <Row label="Ovog meseca" value={driving.month ? `${driving.month.tours} tura · ${formatKm(driving.month.km)} km` : "—"} />
            <Row label="Ukupno" value={driving.total ? `${driving.total.tours} tura · ${formatKm(driving.total.km)} km` : "—"} />
            <Row label="Završenih tura" value={driving.total ? String(driving.total.completed) : "—"} isLast />
          </Card>
        </>
      ) : null}

      {leave ? (
        <>
          <SectionHeader title={leave.year ? `Godišnji odmor ${leave.year}` : "Godišnji odmor"} />
          <Card>
            <Row label="Preostalo dana" value={leave.remainingDays != null ? `${leave.remainingDays} / ${leave.totalDays ?? "—"}` : "—"} />
            <Row label="Iskorišćeno" value={leave.usedDays != null ? `${leave.usedDays} dana` : "—"} />
            <Row label="Preneto iz prethodne godine" value={leave.carriedOver != null ? `${leave.carriedOver} dana` : "—"} isLast />
          </Card>
        </>
      ) : null}

      {employee ? (
        <>
          <SectionHeader title="Zaposlenje" />
          <Card>
            <Row label="Pozicija" value={employee.position} />
            <Row label="Zaposlen od" value={employee.hireDate ? formatDate(employee.hireDate) : null} />
            <Row label="Staž" value={employee.yearsOfService != null ? `${employee.yearsOfService} god.` : null} />
            <Row
              label="Ugovor"
              value={
                employee.contract
                  ? employee.contract.endDate
                    ? `${employee.contract.type ?? "Ugovor"} · do ${formatDate(employee.contract.endDate)}`
                    : `${employee.contract.type ?? "Ugovor"} · na neodređeno`
                  : null
              }
              isLast
            />
          </Card>
          {employee.contract?.daysLeft != null && employee.contract.daysLeft <= 30 ? (
            <View className="mt-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
              <Text className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Ugovor ističe za {employee.contract.daysLeft} dana
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {documents ? (
        <>
          <SectionHeader title="Rokovi dokumenata" />
          <Card>
            <DeadlineRow label={`Vozačka dozvola${documents.licenseCategory ? ` · ${documents.licenseCategory}` : ""}`} date={documents.licenseValidTo} daysLeft={documents.licenseDaysLeft} />
            <DeadlineRow label="Tahograf kartica" date={documents.driverCardValid} daysLeft={documents.driverCardDaysLeft} />
            <DeadlineRow label="Lekarski pregled" date={documents.medicalValidTo} daysLeft={documents.medicalDaysLeft} isLast />
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}
