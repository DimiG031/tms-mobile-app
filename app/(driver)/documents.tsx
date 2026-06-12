import { Ionicons } from "@expo/vector-icons";
import { Linking, RefreshControl, ScrollView } from "react-native";
import { useState } from "react";
import { Pressable, Text, View } from "@/components/ui";
import { useDocuments } from "@/queries/useDocuments";
import { Theme } from "@/lib/theme";
import { formatDate } from "@/lib/formatters";

function formatFileType(value?: string | null): string {
  if (!value) return "Dokument";
  return value.replace(/_/g, " ");
}

export default function DocumentsScreen() {
  const documentsQuery = useDocuments();
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function onRefresh() {
    setIsRefreshing(true);
    try {
      await documentsQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function openDocument(url: string) {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  }

  const documents = documentsQuery.data ?? [];

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: Theme.surface.app }}
      contentContainerStyle={{ paddingBottom: 28 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void onRefresh()}
          tintColor={Theme.accent.primary}
          colors={[Theme.accent.primary]}
        />
      }
    >
      <View className="px-4 pb-3 pt-5">
        <Text className="text-4xl font-extrabold" style={{ color: Theme.text.primary }}>
          Dokumenta
        </Text>
        <Text className="mt-1 text-sm" style={{ color: Theme.text.secondary }}>
          {documents.length} ukupno
        </Text>
      </View>

      <View className="px-4">
        {documentsQuery.isLoading ? (
          <View className="rounded-2xl border px-4 py-5" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
            <Text className="text-sm" style={{ color: Theme.text.secondary }}>Učitavanje dokumenata...</Text>
          </View>
        ) : documentsQuery.isError ? (
          <View className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
            <Text className="font-semibold text-red-700">Greška pri učitavanju dokumenata</Text>
            <Text className="mt-1 text-sm text-red-600">Povucite ekran nadole za ponovno učitavanje.</Text>
          </View>
        ) : documents.length === 0 ? (
          <View className="rounded-2xl border px-4 py-5" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
            <Text className="font-semibold" style={{ color: Theme.text.primary }}>Nema dokumenata</Text>
            <Text className="mt-1 text-sm" style={{ color: Theme.text.secondary }}>
              Dokumenta vezana za turu se i dalje mogu videti u detalju konkretne ture.
            </Text>
          </View>
        ) : (
          documents.map((document) => (
            <View
              key={`${document.id}-${document.fileUrl}`}
              className="mb-3 rounded-2xl border p-4"
              style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}
            >
              <View className="flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: Theme.accent.primaryLight }}>
                  <Ionicons name="document-text-outline" size={20} color={Theme.accent.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold" style={{ color: Theme.text.primary }}>
                    {document.fileName}
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: Theme.text.secondary }}>
                    {formatFileType(document.fileType)} · {formatDate(document.createdAt)}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => void openDocument(document.fileUrl)}
                className="mt-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: Theme.accent.primary }}
              >
                <Text className="text-center font-semibold text-white">Otvori</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
