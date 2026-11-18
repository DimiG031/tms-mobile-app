import { api } from "@/lib/api";
import { readSession, getSessionRevision, assertSessionRevision, replaceSessionIfCurrent, SessionChangedError } from "@/lib/secure-store";

/** Keep the current login after server revocation; a late response cannot restore another login. */
export async function changeOwnPassword(params: { currentPassword: string; newPassword: string }): Promise<void> {
  const revision = getSessionRevision();
  const session = await readSession();
  assertSessionRevision(revision);
  if (!session) throw new SessionChangedError();
  const result = await api.patch<{ ok: true; data: { updated: true; token: string; refreshToken: string } }>("/api/mobile/account/password", params);
  assertSessionRevision(revision);
  // The access token may have refreshed in-flight; the login boundary must still match.
  const current = await readSession();
  assertSessionRevision(revision);
  if (!current || current.refreshToken !== session.refreshToken || current.user.id !== session.user.id) throw new SessionChangedError();
  if (!result.data?.token || !result.data.refreshToken) {
    await replaceSessionIfCurrent(current, null);
    throw new Error("Lozinka je promenjena. Prijavite se ponovo novom lozinkom.");
  }
  if (!(await replaceSessionIfCurrent(current, { ...current, token: result.data.token, refreshToken: result.data.refreshToken }))) {
    throw new SessionChangedError();
  }
}
