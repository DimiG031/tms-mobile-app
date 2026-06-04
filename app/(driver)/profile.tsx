import { ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useState } from "react";
import { Pressable, Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useMobileDriverProfile } from "@/queries/useMobileDriverProfile";
import { Theme } from "@/lib/theme";
import { formatDate } from "@/lib/formatters";

function translateRole(role?: string | null): string {
  if (!role) return "Vozač";
  const r = role.toUpperCase();
  if (r === "DRIVER" || r === "USER") return "Vozač";
  if (r === "DISPATCHER") return "Dispečer";
  if (r === "ADMIN") return "Administrator";
  return role;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: Theme.text.secondary }}>
      {title}
    </Text>
  );
}

function InfoRow({ label, value, isLast = false }: { label: string; value?: string | null; isLast?: boolean }) {
  return (
    <View
      className="py-3"
      style={isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: Theme.surface.border }}
    >
      <Text className="mb-0.5 text-xs" style={{ color: Theme.text.secondary }}>{label}</Text>
      <Text className="text-sm font-semibold" style={{ color: Theme.text.primary }}>{value || "—"}</Text>
    </View>
  );
}

function CertRow({ label, active, validTo, isLast = false }: { label: string; active: boolean; validTo?: string | null; isLast?: boolean }) {
  return (
    <View
      className="flex-row items-center justify-between py-3"
      style={isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: Theme.surface.border }}
    >
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="overflow-hidden rounded-2xl border px-4" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
      {children}
    </View>
  );
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { data, isLoading, isError, error, refetch } = useMobileDriverProfile();
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function onRefresh() {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  const displayName = data?.driver.name ?? data?.user.name ?? session?.user.name ?? "Vozač";

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
        <View
          className="mx-auto mb-3 h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
        >
          <Text className="text-2xl font-bold" style={{ color: "#fff" }}>
            {initials(displayName)}
          </Text>
        </View>
        <Text className="text-center text-2xl font-extrabold" style={{ color: Theme.text.inverse }}>
          {displayName}
        </Text>
        <Text className="mt-1 text-center text-sm" style={{ color: "rgba(255,255,255,0.80)" }}>
          {translateRole(data?.user.role ?? session?.user.role)}
          {data?.company.name ? ` · ${data.company.name}` : ""}
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
            <Pressable
              onPress={() => void refetch()}
              className="mt-3 self-start rounded-lg border border-red-300 px-3 py-2"
            >
              <Text className="text-sm font-semibold text-red-700">Pokušaj ponovo</Text>
            </Pressable>
          </View>
        ) : null}

        {data ? (
          <>
            <SectionHeader title="Osnovni podaci" />
            <Card>
              <InfoRow label="Ime i prezime" value={data.driver.name || data.user.name} />
              <InfoRow label="Email" value={data.user.email} />
              <InfoRow label="Telefon" value={data.driver.phone ?? data.user.phone} />
              <InfoRow label="Adresa" value={data.driver.address} />
              <InfoRow label="Firma" value={data.company.name} isLast />
            </Card>

            <SectionHeader title="Vozačka dozvola" />
            <Card>
              <InfoRow label="Broj dozvole" value={data.driver.licenseNumber} />
              <InfoRow label="Kategorija" value={data.driver.licenseCategory} />
              <InfoRow label="Važi do" value={formatDate(data.driver.licenseValidTo)} isLast />
            </Card>

            <SectionHeader title="Lekarski pregled" />
            <Card>
              <InfoRow label="Datum pregleda" value={formatDate(data.driver.medicalExamDate)} />
              <InfoRow label="Važi do" value={formatDate(data.driver.medicalExamValidTo)} isLast />
            </Card>

            <SectionHeader title="Tahografska kartica" />
            <Card>
              <InfoRow label="ID kartice" value={data.driver.driverCardId} />
              <InfoRow label="Kartica važi do" value={formatDate(data.driver.driverCardValid)} isLast />
            </Card>

            <SectionHeader title="Sertifikati" />
            <Card>
              <CertRow label="ADR" active={data.driver.adrCertificate} validTo={data.driver.adrValidTo} />
              <CertRow label="CPC" active={data.driver.cpcCertificate} validTo={data.driver.cpcValidTo} isLast />
            </Card>

            {data.driver.notes ? (
              <>
                <SectionHeader title="Beleške" />
                <Card>
                  <Text className="py-3 text-sm leading-relaxed" style={{ color: Theme.text.primary }}>
                    {data.driver.notes}
                  </Text>
                </Card>
              </>
            ) : null}
          </>
        ) : null}

        <Pressable
          onPress={() => void signOut()}
          className="mt-6 rounded-xl border px-4 py-3"
          style={{ borderColor: "#fca5a5" }}
        >
          <Text className="text-center font-semibold" style={{ color: "#dc2626" }}>
            Odjavi se
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
