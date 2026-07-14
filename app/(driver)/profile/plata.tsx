import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "@/components/ui";
import { useTheme } from "@/providers/ThemeProvider";
import { useMobilePayslip, useMobilePayslips, useMobilePerDiem } from "@/queries/useMobilePayslips";
import { useMobileProfile } from "@/queries/useMobileProfile";
import { useMobileDriverProfile } from "@/queries/useMobileDriverProfile";
import { useAuth } from "@/providers/AuthProvider";
import { formatMoney } from "@/lib/formatters";
import { payslipHtml, perDiemHtml, sharePdfFromHtml, type PdfHeader } from "@/lib/pdf";

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
  const years = Array.from({ length: 9 }, (_, i) => currentYear - i); // tekuća + 8 unazad
  const [year, setYear] = useState(currentYear);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const listQuery = useMobilePayslips(year);
  const detailQuery = useMobilePayslip(expandedId);
  const payslips = listQuery.data ?? [];

  const perDiemQuery = useMobilePerDiem(year);
  const perDiems = perDiemQuery.data ?? [];
  const [expandedPd, setExpandedPd] = useState<string | null>(null);

  const { session } = useAuth();
  const mobileProfileQuery = useMobileProfile();
  const driverId = mobileProfileQuery.data?.user.driverId ?? session?.user.driverId ?? null;
  const driverProfileQuery = useMobileDriverProfile(Boolean(driverId));
  const pdfHeader: PdfHeader = {
    name: driverProfileQuery.data?.driver.name ?? mobileProfileQuery.data?.driver?.name ?? session?.user.name ?? null,
    company: mobileProfileQuery.data?.company?.name ?? driverProfileQuery.data?.company?.name ?? null,
    address: driverProfileQuery.data?.driver.address ?? mobileProfileQuery.data?.driver?.address ?? null
  };

  async function exportPdf(html: string, title: string) {
    try {
      await sharePdfFromHtml(html, title);
    } catch (e) {
      Alert.alert("Plata", e instanceof Error ? e.message : "Izrada PDF-a nije uspela.");
    }
  }

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: theme.surface.app }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Plata" }} />
      <Text className="text-3xl font-extrabold" style={{ color: theme.text.primary }}>Plata</Text>
      <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>Platni listić po mesecu — stavke i PDF.</Text>

      {/* Godina */}
      <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: theme.text.secondary }}>Godina</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
        {years.map((y) => {
          const active = y === year;
          return (
            <Pressable
              key={y}
              onPress={() => {
                setYear(y);
                setExpandedId(null);
                setExpandedPd(null);
              }}
              className="rounded-xl border px-5 py-2.5"
              style={{ borderColor: active ? theme.accent.primary : theme.surface.border, backgroundColor: active ? theme.accent.primaryLight : theme.surface.card }}
            >
              <Text className="text-center font-semibold" style={{ color: active ? theme.accent.primaryDark : theme.text.secondary }}>{y}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
                  ) : (
                    <>
                      {detail && detail.items.length ? (
                        <>
                          <View style={{ borderTopWidth: 1, borderTopColor: theme.surface.border, paddingTop: 8 }}>
                            {detail.items.map((item, index) => {
                              const negative = (item.amount ?? 0) < 0;
                              return (
                                <View key={`${item.label}-${index}`} className="flex-row items-center justify-between py-1.5">
                                  <View className="flex-1 pr-3">
                                    <Text className="text-sm" style={{ color: theme.text.secondary }}>{item.label}</Text>
                                    {item.installment ? (
                                      <Text className="mt-0.5 text-[11px] font-semibold" style={{ color: theme.accent.primaryDark }}>
                                        {item.installment} rata
                                      </Text>
                                    ) : null}
                                  </View>
                                  <Text className="text-sm font-semibold" style={{ color: negative ? "#dc2626" : theme.text.primary }}>
                                    {item.amount != null ? formatMoney(item.amount, item.currency ?? detail.currency) : "—"}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                          <View className="mt-2 flex-row items-center justify-between" style={{ borderTopWidth: 1, borderTopColor: theme.surface.border, paddingTop: 8 }}>
                            <Text className="text-sm font-bold" style={{ color: theme.text.primary }}>Za isplatu (neto)</Text>
                            <Text className="text-base font-extrabold" style={{ color: theme.accent.primaryDark }}>
                              {detail.net != null ? formatMoney(detail.net, detail.currency) : "—"}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <Text className="pt-2 text-xs" style={{ color: theme.text.muted }}>
                          {detailQuery.isError
                            ? "Stavke trenutno nisu dostupne. Možeš preuzeti listić sa neto/bruto iznosom."
                            : "Nema stavki."}
                        </Text>
                      )}

                      <Pressable
                        onPress={() => void exportPdf(payslipHtml(detail ?? { ...slip, items: [], pdfUrl: null }, pdfHeader), "Platni listić")}
                        className="mt-3 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3"
                        style={{ backgroundColor: theme.accent.primary }}
                      >
                        <Ionicons name="download-outline" size={18} color="#fff" />
                        <Text className="font-semibold text-white">Preuzmi platni listić (PDF)</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Dnevnice — odvojeno od plate */}
      <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest" style={{ color: theme.text.secondary }}>Dnevnice</Text>
      {perDiemQuery.isLoading ? <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 12 }} /> : null}
      {!perDiemQuery.isLoading && !perDiemQuery.isError && !perDiems.length ? (
        <View className="rounded-2xl border border-dashed p-4" style={{ borderColor: theme.surface.border }}>
          <Text className="text-sm" style={{ color: theme.text.secondary }}>Nema dnevnica za {year}.</Text>
        </View>
      ) : null}

      <View className="mt-1 gap-2.5">
        {perDiems.map((pd) => {
          const open = expandedPd === pd.id;
          return (
            <View key={pd.id} className="rounded-2xl border" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
              <Pressable onPress={() => setExpandedPd(open ? null : pd.id)} className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-bold" style={{ color: theme.text.primary }}>{pd.periodLabel}</Text>
                    {pd.note ? <Text className="mt-0.5 text-xs" style={{ color: theme.text.muted }} numberOfLines={1}>{pd.note}</Text> : null}
                  </View>
                  <Text className="text-base font-extrabold" style={{ color: theme.text.primary }}>
                    {pd.amount != null ? formatMoney(pd.amount, pd.currency) : "—"}
                  </Text>
                  <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={theme.text.muted} style={{ marginLeft: 8 }} />
                </View>
              </Pressable>
              {open ? (
                <View className="px-4 pb-4" style={{ borderTopWidth: 1, borderTopColor: theme.surface.border }}>
                  {pd.breakdown.length ? (
                    pd.breakdown.map((row, index) => (
                      <View
                        key={`${row.nalog ?? "row"}-${index}`}
                        className="flex-row items-center justify-between py-2"
                        style={index < pd.breakdown.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.surface.border } : undefined}
                      >
                        <View className="flex-1 pr-3">
                          <Text className="text-sm" style={{ color: theme.text.primary }}>{[row.nalog, row.zemlja].filter(Boolean).join(" · ") || "Stavka"}</Text>
                          {row.dana != null ? <Text className="text-xs" style={{ color: theme.text.muted }}>{row.dana} {row.dana === 1 ? "dan" : "dana"}</Text> : null}
                        </View>
                        <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>{row.iznos != null ? formatMoney(row.iznos, pd.currency) : "—"}</Text>
                      </View>
                    ))
                  ) : (
                    <Text className="pt-2 text-sm" style={{ color: theme.text.muted }}>Nema razrade po turi.</Text>
                  )}
                  <Pressable
                    onPress={() => void exportPdf(perDiemHtml(pd, pdfHeader), "Dnevnice")}
                    className="mt-3 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3"
                    style={{ backgroundColor: theme.accent.primary }}
                  >
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text className="font-semibold text-white">Preuzmi dnevnice (PDF)</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
