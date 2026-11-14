import { PropsWithChildren, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useAuth } from "@/providers/AuthProvider";
import { config } from "@/lib/config";
import { getSessionSnapshot } from "@/lib/secure-store";
import { queryCacheKey, scopedQueryStorage, queryScopeOwner } from "@/lib/query-scope";

function ScopedQueryProvider({ owner, revision, children }: PropsWithChildren<{ owner: string | null; revision: number }>) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, gcTime: 24 * 60 * 60 * 1000, retry: 1 } }
  }));
  const [persister] = useState(() => createAsyncStoragePersister({
    key: queryCacheKey(owner ?? "public"),
    throttleTime: 0,
    storage: scopedQueryStorage(AsyncStorage, () => {
      const current = getSessionSnapshot();
      return current.revision === revision && queryScopeOwner(current.session, config.apiUrl) === owner;
    })
  }));
  useEffect(() => () => {
    void queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);

  if (!owner) return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return (
    <PersistQueryClientProvider client={queryClient} onSuccess={() => queryClient.invalidateQueries()} persistOptions={{
      persister, maxAge: 24 * 60 * 60 * 1000, buster: "v3-owner",
      dehydrateOptions: { shouldDehydrateMutation: () => false }
    }}>
      {children}
    </PersistQueryClientProvider>
  );
}

export function QueryProvider({ children }: PropsWithChildren) {
  const { session, sessionRevision } = useAuth();
  const owner = queryScopeOwner(session, config.apiUrl);
  useEffect(() => {
    // The previous shared cache has no reliable owner; never hydrate it.
    void AsyncStorage.removeItem("tms-query-cache").catch(() => undefined);
  }, []);
  return <ScopedQueryProvider key={`${owner ?? "public"}:${sessionRevision}`} owner={owner} revision={sessionRevision}>{children}</ScopedQueryProvider>;
}
