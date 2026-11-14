/** Hide previously cached metadata after a confirmed access rejection, not after a network outage. */
export function documentReadState<T>(items: T[] | undefined, error: unknown) {
  const status = error && typeof error === "object" ? (error as { status?: number }).status : undefined;
  const accessDenied = status === 401 || status === 403 || status === 404;
  const message = status === 403 ? "Nemate dozvolu za pregled ovih dokumenata."
    : status === 401 ? "Sesija je istekla. Prijavite se ponovo."
    : status === 404 ? "Tura ili dokumenti nisu dostupni."
    : "Učitavanje dokumenata nije uspelo. Proverite vezu i pokušajte ponovo.";
  return { items: accessDenied ? [] as T[] : items ?? [], accessDenied, message };
}
