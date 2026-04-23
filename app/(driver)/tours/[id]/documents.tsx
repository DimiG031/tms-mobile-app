import { useMemo, useState } from "react";
import { Alert, Linking, RefreshControl, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams } from "expo-router";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import { useCreateTourDocument, useTourDocuments } from "@/queries/useTourDocuments";
import { uploadFromFileUri } from "@/services/upload";
import { formatDateTime } from "@/lib/formatters";

const DOC_TYPES = ["PDF", "JPG", "PNG"] as const;

export default function TourDocumentsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const tourId = params.id;

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

  const uploadPickedAsset = async (asset: ImagePicker.ImagePickerAsset) => {
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
  };

  const onCapturePhoto = async () => {
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
  };

  const onPickImage = async () => {
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
  };

  const onPickPdf = async () => {
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
  };

  const onCreateDocument = () => {
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
          Alert.alert("Dokumenta", "Dokument je uspesno sacuvan.");
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Kreiranje dokumenta nije uspelo";
          Alert.alert("Dokumenta", message);
        }
      }
    );
  };

  const onOpenDocument = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Dokument", "Ne mogu da otvorim ovaj URL.");
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      <Text className="text-xl font-bold text-slate-900">Dokumenta ture</Text>
      <Text className="mt-1 text-slate-500">Slikajte ili izaberite dokument, zatim ga sacuvajte uz turu.</Text>

      <View className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Text className="font-semibold text-slate-900">Dodaj dokument</Text>

        <View className="mt-3 gap-3">
          <View className="flex-row gap-2">
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
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          />

          <TextInput
            value={fileUrl}
            onChangeText={setFileUrl}
            autoCapitalize="none"
            placeholder="URL fajla (automatski nakon upload-a)"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          />

          <Text className="text-xs text-slate-500">Tip fajla</Text>
          <View className="flex-row gap-2">
            {DOC_TYPES.map((option) => (
              <Pressable
                key={option}
                onPress={() => setFileType(option)}
                className={`rounded-lg border px-3 py-2 ${fileType === option ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"}`}
              >
                <Text className={fileType === option ? "text-brand-700" : "text-slate-700"}>{option}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={onCreateDocument} disabled={!canSave} className="rounded-xl bg-brand-600 px-4 py-3 disabled:opacity-60">
            <Text className="text-center font-semibold text-white">
              {isUploading ? "Otpremanje..." : createDocument.isPending ? "Cuvanje..." : "Sacuvaj dokument"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <Text className="font-semibold text-slate-900">Otpremljena dokumenta</Text>

        {isLoading ? <Text className="mt-2 text-slate-500">Ucitavanje...</Text> : null}

        {isError ? (
          <View className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <Text className="text-red-700">Ucitavanje dokumenata nije uspelo.</Text>
            <Pressable onPress={() => void refetch()} className="mt-2 self-start rounded-lg border border-red-300 px-3 py-2">
              <Text className="text-red-700">Pokusaj ponovo</Text>
            </Pressable>
          </View>
        ) : null}

        {sortedDocs.map((doc) => (
          <Pressable key={doc.id} onPress={() => void onOpenDocument(doc.fileUrl)} className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Text className="font-medium text-slate-900">{doc.fileName}</Text>
            <Text className="mt-1 text-xs text-slate-600">Tip: {doc.fileType}</Text>
            <Text className="mt-1 text-xs text-slate-600">Kreirano: {formatDateTime(doc.createdAt)}</Text>
            <Text className="mt-2 text-xs font-semibold text-brand-700">Otvori dokument</Text>
          </Pressable>
        ))}

        {!isLoading && !sortedDocs.length ? <Text className="mt-2 text-slate-500">Nema dokumenata za ovu turu.</Text> : null}
      </View>
    </ScrollView>
  );
}
