import { useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "@/components/ui";
import { useTheme } from "@/providers/ThemeProvider";
import { useMobilePayslip, useMobilePayslips } from "@/queries/useMobilePayslips";
import { formatMoney } from "@/lib/formatters";

function translatePayslipStatus(status?: string | null): string {
  const s = status?.toUpperCase();
  if (s === "PAID" || s === "ISPLACENO") return "Isplaćeno";
  if (s === "FINALIZED" || s === "APPROVED" || s === "CONFIRMED") return "Konačan";
  if (s === "DRAFT") return "Nacrt";
  return status ?? "";
}

export default function PlataScreen() {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];
  const [year, setYear] = useState(currentYear);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const listQuery = useMobilePayslips(year);
  const detailQuery = useMobilePayslip(expandedId);
  const payslips = listQuery.data ?? [];

  function openPdf(url: string) {
    Linking.openURL(url).catch(() => Alert.alert("Plata", "Otvaranje PDF-a nije uspelo."));
  }

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: theme.surface.app }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Plata" }} />
      <Text className="text-3xl font-extrabold" style={{ color: theme.text.primary }}>Plata</Text>
      <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>Platni listić po mesecu — stavke i PDF.</Text>

      {/* Godina */}
      <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: theme.text.secondary }}>Godina</Text>
      <View className="flex-row gap-2">
        {years.map((y) => {
          const active = y === year;
          return (
            <Pressable
              key={y}
              onPress={() => {
                setYear(y);
                setExpandedId(null);
              }}
              className="flex-1 rounded-xl border px-3 py-2.5"
              style={{ borderColor: active ? theme.accent.primary : theme.surface.border, backgroundColor: active ? theme.accent.primaryLight : theme.surface.card }}
            >
              <Text className="text-center font-semibold" style={{ color: active ? theme.accent.primaryDark : theme.text.secondary }}>{y}</Text>
            </Pressable>
          );
        })}
      </View>

      {listQuery.isLoading ? <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 24 }} /> : null}

      {listQuery.isError ? (
        <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
          <Text className="font-semibold text-red-700 dark:text-red-300">Greška pri učitavanju plata</Text>
          <Text className="mt-1 text-xs text-red-600 dark:text-red-400">
            {listQuery.error instanceof Error ? listQuery.error.message : "Pokušajte kasnije."}
          </Text>
        </View>
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && !payslips.length ? (
        <View className="mt-4 rounded-2xl border border-dashed p-4" style={{ borderColor: theme.surface.border }}>
          <Text className="text-sm" style={{ color: theme.text.secondary }}>Nema obračuna za {year}.</Text>
        </View>
      ) : null}

      <View className="mt-4 gap-2.5">
        {payslips.map((slip) => {
          const expanded = expandedId === slip.id;
          const detail = expanded ? detailQuery.data : null;
          return (
            <View key={slip.id} className="rounded-2xl border" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
              <Pressable onPress={() => setExpandedId(expanded ? null : slip.id)} className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-bold" style={{ color: theme.text.primary }}>{slip.periodLabel}</Text>
                    {slip.status ? (
                      <Text className="mt-0.5 text-xs" style={{ color: theme.text.muted }}>{translatePayslipStatus(slip.status)}</Text>
                    ) : null}
                  </View>
                  <View className="items-end">
                    <Text className="text-[11px] uppercase" style={{ color: theme.text.muted }}>Neto</Text>
                    <Text className="text-base font-extrabold" style={{ color: theme.text.primary }}>
                      {slip.net != null ? formatMoney(slip.net, slip.currency) : "—"}
                    </Text>
                  </View>
                  <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.text.muted} style={{ marginLeft: 8 }} />
                </View>
              </Pressable>

              {expanded ? (
                <View className="px-4 pb-4">
                  {detailQuery.isLoading ? (
                    <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 12 }} />
                  ) : detailQuery.isError ? (
                    <Text className="text-xs text-red-600">Greška pri učitavanju stavki.</Text>
                  ) : detail ? (
                    <>
                      <View style={{ borderTopWidth: 1, borderTopColor: theme.surface.border, paddingTop: 8 }}>
                        {detail.items.length ? (
                          detail.items.map((item, index) => {
                            const negative = (item.amount ?? 0) < 0;
                            return (
                              <View key={`${item.label}-${index}`} className="flex-row items-center justify-between py-1.5">
                                <Text className="flex-1 pr-3 text-sm" style={{ color: theme.text.secondary }}>{item.label}</Text>
                                <Text className="text-sm font-semibold" style={{ color: negative ? "#dc2626" : theme.text.primary }}>
                                  {item.amount != null ? formatMoney(item.amount, item.currency ?? detail.currency) : "—"}
                                </Text>
                              </View>
                            );
                          })
                        ) : (
                          <Text className="text-sm" style={{ color: theme.text.muted }}>Nema stavki.</Text>
                        )}
                      </View>

                      <View className="mt-2 flex-row items-center justify-between" style={{ borderTopWidth: 1, borderTopColor: theme.surface.border, paddingTop: 8 }}>
                        <Text className="text-sm font-bold" style={{ color: theme.text.primary }}>Za isplatu (neto)</Text>
                        <Text className="text-base font-extrabold" style={{ color: theme.accent.primaryDark }}>
                          {detail.net != null ? formatMoney(detail.net, detail.currency) : "—"}
                        </Text>
                      </View>

                      {detail.pdfUrl ? (
                        <Pressable
                          onPress={() => openPdf(detail.pdfUrl as string)}
                          className="mt-3 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3"
                          style={{ backgroundColor: theme.accent.primary }}
                        >
                          <Ionicons name="download-outline" size={18} color="#fff" />
                          <Text className="font-semibold text-white">Preuzmi platni listić (PDF)</Text>
                        </Pressable>
                      ) : null}
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
