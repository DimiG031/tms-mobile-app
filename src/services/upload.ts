import { config } from "@/lib/config";
import { readSession } from "@/lib/secure-store";

type PresignResponse = {
  ok: true;
  data: {
    uploadUrl: string;
    fileUrl: string;
    key: string;
    useLocal: boolean;
  };
};

function toAbsoluteUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${config.apiUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

export async function requestUploadTarget(params: {
  filename: string;
  contentType: string;
  contentLength?: number;
  folder?: string;
}): Promise<PresignResponse["data"]> {
  const session = await readSession();
  const response = await fetch(`${config.apiUrl}/api/upload/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Nije moguce zatraziti upload lokaciju");
  }

  const payload = (await response.json()) as PresignResponse;
  return payload.data;
}

export async function uploadFromFileUri(params: {
  uri: string;
  filename: string;
  mimeType: string;
  folder?: string;
}): Promise<{ fileUrl: string; key: string }> {
  const { uri, filename, mimeType, folder = "documents" } = params;
  const session = await readSession();
  const target = await requestUploadTarget({
    filename,
    contentType: mimeType,
    folder
  });

  if (!session?.token) {
    throw new Error("Nedostaje auth sesija");
  }

  if (target.useLocal) {
    const formData = new FormData();
    formData.append("key", target.key);
    formData.append("file", {
      uri,
      name: filename,
      type: mimeType
    } as unknown as Blob);

    const localRes = await fetch(target.uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`
      },
      body: formData
    });

    if (!localRes.ok) {
      const text = await localRes.text();
      throw new Error(text || "Lokalno otpremanje nije uspelo");
    }

    const localPayload = (await localRes.json()) as { ok: true; data: { fileUrl: string; key: string } };
    return {
      fileUrl: toAbsoluteUrl(localPayload.data.fileUrl),
      key: localPayload.data.key
    };
  }

  const fileResponse = await fetch(uri);
  const fileBlob = await fileResponse.blob();

  const uploadRes = await fetch(target.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType
    },
    body: fileBlob
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(text || "Direktno otpremanje nije uspelo");
  }

  return {
    fileUrl: toAbsoluteUrl(target.fileUrl),
    key: target.key
  };
}
