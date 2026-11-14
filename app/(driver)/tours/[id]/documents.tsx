import { documentReadState } from "@/lib/documentReadState";
import { useQueryClient } from "@tanstack/react-query";
import { getSessionRevision, assertSessionRevision, SessionChangedError } from "@/lib/secure-store";
import { openDocument } from "@/services/openDocument";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { IOSCard } from "@/components/ios/IOSCard";
import { IOSGlassPill } from "@/components/ios/IOSGlassPill";
import { Pressable, TextInput } from "@/components/ui";
import { formatDateTime } from "@/lib/formatters";
import { useTheme, type AppTheme } from "@/providers/ThemeProvider";
import { api } from "@/lib/api";
import { useCreateTourDocument, usePendingTourDocuments, useTourDocuments } from "@/queries/useTourDocuments";
import { uploadFromFileUri } from "@/services/upload";

const DOC_TYPES = ["PDF", "JPG", "PNG"] as const;

export default function TourDocumentsScreen() {
  const params = useLocalSearchParams<{ id: string; from?: string }>();
  const tourId = params.id;
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { data, error: documentsError, isLoading, isError, isRefetching, refetch } = useTourDocuments(tourId);
  const createDocument = useCreateTourDocument(tourId);
  const queryClient = useQueryClient();
  const pendingDocuments = usePendingTourDocuments(tourId);
  const saveInFlight = useRef(false);
  const retryInFlight = useRef(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState<string>("JPG");
  const [isUploading, setIsUploading] = useState(false);

  const canSave = Boolean(fileName.trim() && fileUrl.trim()) && !createDocument.isPending && !isUploading;

  const sortedDocs = useMemo(() => {
    return [...documentReadState(data, documentsError).items].sort((a, b) => {
      const aTs = new Date(a.createdAt).getTime();
      const bTs = new Date(b.createdAt).getTime();
      return bTs - aTs;
    });
  }, [data, documentsError]);

  async function uploadPickedAsset(asset: ImagePicker.ImagePickerAsset) {
    try {
      setIsUploading(true);
      setFileUrl("");

      const mimeType = asset.mimeType || "image/jpeg";
      const ext = mimeType === "image/png" ? "png" : "jpg";
      const generatedName = `${Date.now()}-tour-doc.${ext}`;

      const upload = await uploadFromFileUri({
        uri: asset.uri,
        filename: fileName.trim() || generatedName,
        mimeType,
        folder: "documents",
        tourId
      });

      setFileUrl(upload.fileUrl);
      if (!fileName.trim()) {
        setFileName(generatedName);
      }
      setFileType(mimeType === "image/png" ? "PNG" : "JPG");
    } catch (error) {
      if (error instanceof SessionChangedError) return;
      const message = error instanceof Error ? error.message : "Otpremanje nije uspelo";
      Alert.alert("Otpremanje", message);
    } finally {
      setIsUploading(false);
    }
  }

  async function onCapturePhoto() {
    const revision = getSessionRevision();
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      assertSessionRevision(revision);
      if (permission.status !== "granted") { Alert.alert("Kamera", "Potrebna je dozvola za kameru."); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.75, allowsEditing: false, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      assertSessionRevision(revision);
      if (result.canceled || !result.assets.length) return;
      await uploadPickedAsset(result.assets[0]);
    } catch (error) {
      if (error instanceof SessionChangedError) return;
      Alert.alert("Kamera", error instanceof Error ? error.message : "Kameru nije moguće otvoriti.");
    }
  }

  async function onPickImage() {
    const revision = getSessionRevision();
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      assertSessionRevision(revision);
      if (permission.status !== "granted") { Alert.alert("Galerija", "Potrebna je dozvola za galeriju."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: false, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      assertSessionRevision(revision);
      if (result.canceled || !result.assets.length) return;
      await uploadPickedAsset(result.assets[0]);
    } catch (error) {
      if (error instanceof SessionChangedError) return;
      Alert.alert("Galerija", error instanceof Error ? error.message : "Galeriju nije moguće otvoriti.");
    }
  }

  async function onPickFile() {
    const revision = getSessionRevision();
    let result: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
        multiple: false
      });
      assertSessionRevision(revision);
    } catch (error) {
      if (error instanceof SessionChangedError) return;
      Alert.alert("Dokumenta", error instanceof Error ? error.message : "Izbor fajla nije uspeo.");
      return;
    }

    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];

    try {
      setIsUploading(true);
      const byMime: Record<string, { mimeType: string; fileType: string; extension: string }> = {
        "application/pdf": { mimeType: "application/pdf", fileType: "PDF", extension: "pdf" },
        "image/jpeg": { mimeType: "image/jpeg", fileType: "JPG", extension: "jpg" },
        "image/png": { mimeType: "image/png", fileType: "PNG", extension: "png" }
      };
      const mime = asset.mimeType?.trim().toLowerCase();
      const extension = asset.name?.split(".").pop()?.toLowerCase();
      const fallbackMime = extension === "pdf" ? "application/pdf"
        : extension === "jpg" || extension === "jpeg" ? "image/jpeg"
        : extension === "png" ? "image/png" : "";
      const format = byMime[mime && mime !== "application/octet-stream" ? mime : fallbackMime];
      if (!format) throw new Error("Izaberi PDF, JPG ili PNG fajl.");
      const generatedName = asset.name || `document_${Date.now()}.${format.extension}`;
      setFileUrl("");
      const upload = await uploadFromFileUri({
        uri: asset.uri,
        filename: generatedName,
        mimeType: format.mimeType,
        folder: "documents",
        tourId
      });

      setFileUrl(upload.fileUrl);
      setFileName(generatedName);
      setFileType(format.fileType);
    } catch (error) {
      if (error instanceof SessionChangedError) return;
      const message = error instanceof Error ? error.message : "Otpremanje fajla nije uspelo";
      Alert.alert("Dokumenta", message);
    } finally {
      setIsUploading(false);
    }
  }

  function onCreateDocument() {
    if (saveInFlight.current || isUploading) return;
    if (!fileName.trim() || !fileUrl.trim()) {
      Alert.alert("Dokumenta", "Naziv fajla i URL su obavezni.");
      return;
    }

    saveInFlight.current = true;
    const revision = getSessionRevision();
    createDocument.mutate(
      {
        fileName: fileName.trim(),
        fileUrl: fileUrl.trim(),
        fileType: fileType.trim().toUpperCase()
      },
      {
        onSuccess: (result) => {
          if (getSessionRevision() !== revision) return;
          setFileName("");
          setFileUrl("");
          setFileType("JPG");
          if (!result.queued && result.noticeScheduled) return;
          if (result.queued || !result.noticeScheduled) Alert.alert("Dokumenta", result.queued
            ? result.delivery === "blocked"
              ? `Zahtev nije prihvaćen. ${result.message || ""} Sačuvan je među zahtevima ispod za proveru i ponovni pokušaj.`
              : "Zahtev je sačuvan na uređaju i čeka slanje. Potvrda servera još nije stigla. Aplikacija će automatski pokušati ponovo."
            : "Dokument je uspešno sačuvan na serveru.");
        },
        onError: (error) => {
          if (getSessionRevision() !== revision || error instanceof SessionChangedError) return;
          const message = error instanceof Error ? error.message : "Čuvanje nije potvrđeno. Proverite zahteve ispod.";
          Alert.alert("Dokumenta", message);
        },
        onSettled: () => { saveInFlight.current = false; }
      }
    );
  }

  async function onRetryDocument(id: string) {
    if (retryInFlight.current) return;
    retryInFlight.current = true;
    const revision = getSessionRevision();
    setRetryingId(id);
    try {
      const result = await api.retryDocument(id);
      assertSessionRevision(revision);
      Alert.alert("Dokumenta", result.queued
        ? result.delivery === "blocked" ? `Zahtev nije prihvaćen. ${result.message || "Proverite podatke i dozvole."}`
          : "Potvrda servera još nije stigla. Zahtev čeka automatski ponovni pokušaj."
        : "Dokument je uspešno sačuvan na serveru.");
      if (!result.queued && !result.noticeScheduled) await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["tour-documents", tourId] }),
        queryClient.invalidateQueries({ queryKey: ["documents"] }),
        queryClient.invalidateQueries({ queryKey: ["tour-details", tourId] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
      ]);
    } catch (error) {
      if (getSessionRevision() === revision && !(error instanceof SessionChangedError)) Alert.alert("Dokumenta", error instanceof Error ? error.message : "Čuvanje nije potvrđeno.");
    } finally { retryInFlight.current = false; setRetryingId(null); }
  }

  async function onOpenDocument(url: string) {
    try { await openDocument(url); }
    catch (error) { if (error instanceof SessionChangedError) return; Alert.alert("Dokument", error instanceof Error ? error.message : "Otvaranje dokumenta nije uspelo."); }
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
            <Pressable onPress={onCapturePhoto} disabled={isUploading || createDocument.isPending} className="flex-1 rounded-xl border border-brand-500 px-4 py-3 disabled:opacity-60">
              <Text className="text-center font-semibold text-brand-700">Slikaj</Text>
            </Pressable>
            <Pressable onPress={onPickImage} disabled={isUploading || createDocument.isPending} className="flex-1 rounded-xl border border-brand-500 px-4 py-3 disabled:opacity-60">
              <Text className="text-center font-semibold text-brand-700">Galerija</Text>
            </Pressable>
          </View>
          <Pressable onPress={onPickFile} disabled={isUploading || createDocument.isPending} className="rounded-xl border border-brand-500 px-4 py-3 disabled:opacity-60">
            <Text className="text-center font-semibold text-brand-700">Fajl (PDF / JPG / PNG)</Text>
          </Pressable>

          <TextInput
            value={fileName}
            editable={!createDocument.isPending && !isUploading}
            onChangeText={setFileName}
            placeholder="Naziv fajla (npr. CMR-BG-Munchen.jpg)"
            placeholderTextColor={theme.text.muted}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />

          <TextInput
            value={fileUrl}
            editable={!createDocument.isPending && !isUploading}
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
                onPress={() => { if (!createDocument.isPending && !isUploading) setFileType(option); }}
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

      {pendingDocuments.length ? (
        <IOSCard style={styles.section}>
          <Text style={styles.sectionTitle}>Zahtevi koji čekaju potvrdu</Text>
          {pendingDocuments.map(item => (
            <View key={item.id} className="mt-3 rounded-lg border border-slate-300 p-3 dark:border-slate-600">
              <Text className="font-medium text-slate-900 dark:text-slate-100">{item.fileName}</Text>
              <Text className="mt-1 text-sm text-slate-700 dark:text-slate-300">{item.message}</Text>
              {item.canRetry ? (
                <Pressable disabled={Boolean(retryingId)} onPress={() => void onRetryDocument(item.id)} className="mt-2 rounded-lg bg-brand-600 px-3 py-2 disabled:opacity-60">
                  <Text className="text-center font-semibold text-white">{retryingId === item.id ? "Provera..." : "Pokušaj ponovo"}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </IOSCard>
      ) : null}

      <IOSCard style={styles.section}>
        <Text style={styles.sectionTitle}>Otpremljena dokumenta</Text>

        {isLoading ? <Text style={styles.loading}>Učitavanje...</Text> : null}

        {isError ? (
          <View className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <Text className="text-red-700">{documentReadState(data, documentsError).message}</Text>
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

        {!isLoading && !isError && !sortedDocs.length ? <Text style={styles.loading}>Nema dokumenata za ovu turu.</Text> : null}
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

