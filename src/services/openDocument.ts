import { Linking } from "react-native";
import { api } from "@/lib/api";
import { config } from "@/lib/config";
import { openDocumentReference } from "@/lib/documentOpen";
import { sharePdfFromHtml } from "@/lib/pdf";
export function openDocument(reference: string): Promise<void> {
 return openDocumentReference(reference, {
  apiUrl: config.apiUrl,
  get: path => api.get<unknown>(path),
  openUrl: url => Linking.openURL(url),
  shareHtml: (html, title) => sharePdfFromHtml(html, title),
 });
}
