import { getSessionRevision, assertSessionRevision } from "@/lib/secure-store";
import { openPrivateDocument } from "@/services/privateDocument";
import { Linking } from "react-native";
import { api } from "@/lib/api";
import { config } from "@/lib/config";
import { openDocumentReference } from "@/lib/documentOpen";
import { sharePdfFromHtml } from "@/lib/pdf";
export function openDocument(reference: string): Promise<void> {
 const revision = getSessionRevision();
 return openDocumentReference(reference, {
  apiUrl: config.apiUrl,
  get: async path => { assertSessionRevision(revision); const result = await api.get<unknown>(path); assertSessionRevision(revision); return result; },
  openUrl: url => { assertSessionRevision(revision); return Linking.openURL(url); },
  openPrivate: path => { assertSessionRevision(revision); return openPrivateDocument(path, revision); },
  shareHtml: (html, title) => { assertSessionRevision(revision); return sharePdfFromHtml(html, title, () => assertSessionRevision(revision)); },
 });
}
