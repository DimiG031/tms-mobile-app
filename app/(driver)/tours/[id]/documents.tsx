import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { IOSCard } from "@/components/ios/IOSCard";
import { IOSGlassPill } from "@/components/ios/IOSGlassPill";
import { Pressable, TextInput } from "@/components/ui";
import { formatDateTime } from "@/lib/formatters";
import { useTheme, type AppTheme } from "@/providers/ThemeProvider";
import { useCreateTourDocument, useTourDocuments } from "@/queries/useTourDocuments";
import { uploadFromFileUri } from "@/services/upload";

const DOC_TYPES = ["PDF", "JPG", "PNG"] as const;

export default function TourDocumentsScreen() {
  const params = useLocalSearchParams<{ id: string; from?: string }>();
  const tourId = params.id;
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { data, isLoading, isError, isRefetching, refetch } = useTourDocuments(tourId);
  const createDocument = useCreateTourDocument(tourId);

  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState<string>("JPG");
  const [isUploading, setIsUploading] = useState(false);

  const canSave = Boolean(fileName.trim() && fileUrl.trim()) && !createDocument.isPending && !isUploading;

  const sortedDocs = useMemo(() => {
    return [...(data ?? [])].sort((a, b) => {
      const aTs = new Date(a.createdAt).getTime();
      const bTs = new Date(b.createdAt).getTime();
      return bTs - aTs;
    });
  }, [data]);

  async function uploadPickedAsset(asset: ImagePicker.ImagePickerAsset) {
    try {
      setIsUploading(true);

      const mimeType = asset.mimeType || "image/jpeg";
      const ext = mimeType === "image/png" ? "png" : "jpg";
      const generatedName = `${Date.now()}-tour-doc.${ext}`;

      const upload = await uploadFromFileUri({
        uri: asset.uri,
        filename: fileName.trim() || generatedName,
        mimeType,
        folder: "documents"
      });

      setFileUrl(upload.fileUrl);
      if (!fileName.trim()) {
        setFileName(generatedName);
      }
      setFileType(mimeType === "image/png" ? "PNG" : "JPG");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Otpremanje nije uspelo";
      Alert.alert("Otpremanje", message);
    } finally {
      setIsUploading(false);
    }
  }

  async function onCapturePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Kamera", "Potrebna je dozvola za kameru.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.75,
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images
    });

    if (result.canceled || !result.assets.length) return;
    await uploadPickedAsset(result.assets[0]);
  }

  async function onPickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Galerija", "Potrebna je dozvola za galeriju.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images
    });

    if (result.canceled || !result.assets.length) return;
    await uploadPickedAsset(result.assets[0]);
  }

  async function onPickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];

    try {
      setIsUploading(true);
      const generatedName = asset.name || `document_${Date.now()}.pdf`;
      const upload = await uploadFromFileUri({
        uri: asset.uri,
        filename: generatedName,
        mimeType: asset.mimeType || "application/pdf",
        folder: "documents"
      });

      setFileUrl(upload.fileUrl);
      setFileName(generatedName);
      setFileType("PDF");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Otpremanje PDF fajla nije uspelo";
      Alert.alert("Dokumenta", message);
    } finally {
      setIsUploading(false);
    }
  }

  function onCreateDocument() {
    if (!fileName.trim() || !fileUrl.trim()) {
      Alert.alert("Dokumenta", "Naziv fajla i URL su obavezni.");
      return;
    }

    createDocument.mutate(
      {
        fileName: fileName.trim(),
        fileUrl: fileUrl.trim(),
        fileType: fileType.trim().toUpperCase()
      },
      {
        onSuccess: () => {
          setFileName("");
          setFileUrl("");
          setFileType("JPG");
          Alert.alert("Dokumenta", "Dokument je uspešno sačuvan.");
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Kreiranje dokumenta nije uspelo";
          Alert.alert("Dokumenta", message);
        }
      }
    );
  }

  async function onOpenDocument(url: string) {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Dokument", "Ne mogu da otvorim ovaj URL.");
      return;
    }
    await Linking.openURL(url);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      <Text style={styles.title}>Dokumenta ture</Text>
      <Text style={styles.subtitle}>Slikajte ili izaberite dokument, zatim ga sačuvajte uz turu.</Text>

      <IOSCard glass style={styles.section}>
        <Text style={styles.sectionTitle}>Dodaj dokument</Text>

        <View style={styles.stack}>
          <View style={styles.row}>
            <Pressable onPress={onCapturePhoto} disabled={isUploading} className="flex-1 rounded-xl border border-brand-500 px-4 py-3 disabled:opacity-60">
              <Text className="text-center font-semibold text-brand-700">Slikaj</Text>
            </Pressable>
            <Pressable onPress={onPickImage} disabled={isUploading} className="flex-1 rounded-xl border border-brand-500 px-4 py-3 disabled:opacity-60">
              <Text className="text-center font-semibold text-brand-700">Galerija</Text>
            </Pressable>
          </View>
          <Pressable onPress={onPickPdf} disabled={isUploading} className="rounded-xl border border-brand-500 px-4 py-3 disabled:opacity-60">
            <Text className="text-center font-semibold text-brand-700">Fajl (PDF)</Text>
          </Pressable>

          <TextInput
            value={fileName}
            onChangeText={setFileName}
            placeholder="Naziv fajla (npr. CMR-BG-Munchen.jpg)"
            placeholderTextColor={theme.text.muted}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />

          <TextInput
            value={fileUrl}
            onChangeText={setFileUrl}
            autoCapitalize="none"
            placeholder="URL fajla (automatski nakon upload-a)"
            placeholderTextColor={theme.text.muted}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />

          <Text style={styles.helpLabel}>Tip fajla</Text>
          <View style={styles.rowWrap}>
            {DOC_TYPES.map((option) => (
              <IOSGlassPill
                key={option}
                size="sm"
                label={option}
                variant={fileType === option ? "accent" : "default"}
                onPress={() => setFileType(option)}
              />
            ))}
          </View>

          <Pressable onPress={onCreateDocument} disabled={!canSave} className="rounded-xl bg-brand-600 px-4 py-3 disabled:opacity-60">
            <Text className="text-center font-semibold text-white">
              {isUploading ? "Otpremanje..." : createDocument.isPending ? "Čuvanje..." : "Sačuvaj dokument"}
            </Text>
          </Pressable>
        </View>
      </IOSCard>

      <IOSCard style={styles.section}>
        <Text style={styles.sectionTitle}>Otpremljena dokumenta</Text>

        {isLoading ? <Text style={styles.loading}>Učitavanje...</Text> : null}

        {isError ? (
          <View className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <Text className="text-red-700">Učitavanje dokumenata nije uspelo.</Text>
            <Pressable onPress={() => void refetch()} className="mt-2 self-start rounded-lg border border-red-300 px-3 py-2">
              <Text className="text-red-700">Pokušaj ponovo</Text>
            </Pressable>
          </View>
        ) : null}

        {sortedDocs.map((doc) => (
          <Pressable key={doc.id} onPress={() => void onOpenDocument(doc.fileUrl)} className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <Text className="font-medium text-slate-900 dark:text-slate-100">{doc.fileName}</Text>
            <Text className="mt-1 text-xs text-slate-600 dark:text-slate-400">Tip: {doc.fileType}</Text>
            <Text className="mt-1 text-xs text-slate-600 dark:text-slate-400">Kreirano: {formatDateTime(doc.createdAt)}</Text>
            <Text className="mt-2 text-xs font-semibold text-brand-700">Otvori dokument</Text>
          </Pressable>
        ))}

        {!isLoading && !sortedDocs.length ? <Text style={styles.loading}>Nema dokumenata za ovu turu.</Text> : null}
      </IOSCard>
    </ScrollView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.surface.app
    },
    content: {
      padding: 16,
      paddingBottom: 40
    },
    title: {
      color: theme.text.primary,
      fontSize: 26,
      fontWeight: "800"
    },
    subtitle: {
      marginTop: 4,
      color: theme.text.secondary
    },
    section: {
      marginTop: 12
    },
    sectionTitle: {
      color: theme.text.primary,
      fontWeight: "700",
      fontSize: 16
    },
    stack: {
      marginTop: 12,
      gap: 12
    },
    row: {
      flexDirection: "row",
      gap: 8
    },
    rowWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    helpLabel: {
      color: theme.text.secondary,
      fontSize: 12
    },
    loading: {
      marginTop: 8,
      color: theme.text.secondary
    }
  });
}
