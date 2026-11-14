import { diagnosticMobileFetch } from "@/lib/diagnostics";
import { toAbsoluteUrl } from "@/lib/urls";
import { readSession, getSessionRevision, assertSessionRevision } from "@/lib/secure-store";

const UPLOAD_CONNECTION_MESSAGE = "Nije moguće potvrditi otpremanje fajla. Proveri vezu sa serverom i pokušaj ponovo. Fajl nije dodat u red za kasnije slanje.";

async function uploadTransport<T>(send: () => Promise<T>): Promise<T> {
  const revision = getSessionRevision();
  try { return await send(); }
  catch { assertSessionRevision(revision); throw new Error(UPLOAD_CONNECTION_MESSAGE); }
}

type PresignResponse = {
  ok: true;
  data: {
    uploadUrl: string;
    fileUrl: string;
    key: string;
    useLocal: boolean;
  };
};

export async function requestUploadTarget(params: {
  filename: string;
  contentType: string;
  contentLength?: number;
  folder?: string;
  tourId?: string;
}): Promise<PresignResponse["data"]> {
  const revision = getSessionRevision();
  const session = await readSession();
  assertSessionRevision(revision);
  const response = await uploadTransport(() => diagnosticMobileFetch("/api/upload/presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
    },
    body: JSON.stringify(params)
  }));

  assertSessionRevision(revision);
  if (!response.ok) {
    const message = await uploadErrorMessage(response, "Nije moguće zatražiti upload lokaciju.");
    assertSessionRevision(revision);
    throw new Error(message);
  }

  const payload = (await response.json()) as PresignResponse;
  assertSessionRevision(revision);
  return payload.data;
}

export async function uploadFromFileUri(params: {
  uri: string;
  filename: string;
  mimeType: string;
  folder?: string;
  tourId?: string;
}): Promise<{ fileUrl: string; key: string }> {
  const { uri, filename, mimeType, folder = "documents", tourId } = params;
  const revision = getSessionRevision();
  const session = await readSession();
  assertSessionRevision(revision);
  const target = await requestUploadTarget({
    filename,
    contentType: mimeType,
    folder,
    tourId
  });

  assertSessionRevision(revision);
  if (!session?.token) {
    throw new Error("Nedostaje auth sesija");
  }

  if (target.useLocal) {
    const formData = new FormData();
    formData.append("key", target.key);
    if (tourId) formData.append("tourId", tourId);
    formData.append("file", {
      uri,
      name: filename,
      type: mimeType
    } as unknown as Blob);

    const localRes = await uploadTransport(() => diagnosticMobileFetch("/api/upload/local", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`
      },
      body: formData
    }));

    assertSessionRevision(revision);
    if (!localRes.ok) {
      const message = await uploadErrorMessage(localRes, "Lokalno otpremanje nije uspelo.");
      assertSessionRevision(revision);
      throw new Error(message);
    }

    const localPayload = (await localRes.json()) as { ok: true; data: { fileUrl: string; key: string } };
    assertSessionRevision(revision);
    return {
      fileUrl: toAbsoluteUrl(localPayload.data.fileUrl),
      key: localPayload.data.key
    };
  }

  let fileBlob: Blob;
  try {
    const fileResponse = await fetch(uri);
    fileBlob = await fileResponse.blob();
  } catch {
    assertSessionRevision(revision);
    throw new Error("Izabrani fajl nije moguće pročitati. Izaberi ga ponovo.");
  }

  assertSessionRevision(revision);
  const uploadRes = await uploadTransport(() => fetch(target.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType
    },
    body: fileBlob
  }));

  assertSessionRevision(revision);
  if (!uploadRes.ok) {
    const message = await uploadErrorMessage(uploadRes, "Direktno otpremanje nije uspelo.");
    assertSessionRevision(revision);
    throw new Error(message);
  }

  return {
    fileUrl: toAbsoluteUrl(target.fileUrl),
    key: target.key
  };
}


async function uploadErrorMessage(response: Pick<Response, "text" | "status">, fallback: string): Promise<string> {
 const messages: Record<number,string> = {401:"Sesija je istekla. Prijavite se ponovo.",403:"Nemate dozvolu za dodavanje ovog dokumenta.",413:"Fajl je prevelik.",415:"Tip fajla nije dozvoljen."};
 try {
  const payload: unknown = JSON.parse(await response.text());
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
   const error=(payload as Record<string,unknown>).error;
   if (typeof error === "string" && error.trim() && error.length <= 300 && !["Forbidden","Unauthorized","Unauthenticated","AccountInactive","Server error"].includes(error)) return error;
  }
 } catch { /* Non-JSON storage responses and network read errors use a safe message. */ }
 return messages[response.status] ?? fallback;
}
