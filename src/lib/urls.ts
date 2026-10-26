import { config } from "@/lib/config";

/**
 * Backend čuva putanje fajlova relativno (`/uploads/...`), a `Image` i
 * `Linking` na mobilnoj traže pun URL — inače slika ostane prazna bez ijedne
 * greške. Zato sve što dolazi iz `fileUrl`/`avatarUrl` prolazi kroz ovo.
 */
export function toAbsoluteUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${config.apiUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

/** Isto, ali trpi prazno — zgodno za opciona polja poput slike vozača. */
export function toAbsoluteUrlOrNull(url?: string | null): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  return toAbsoluteUrl(trimmed);
}
