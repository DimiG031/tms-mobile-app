import { PropsWithChildren, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "tms-query-cache"
});

// Kesirani odgovori prezivljavaju restart 24h. Kad se promeni OBLIK
// normalizovanih podataka, stari kes se cita kao da je nov — tako je putni
// list pucao na "reduce of undefined", a polja posade se nisu videla.
//
// PODIGNI OVU VREDNOST kad god promenis oblik necega sto se kesira
// (normalizatori u src/lib/api-normalizers.ts, oblik odgovora u src/queries).
// Promena odbacuje stari kes na svim uredjajima pri sledecem pokretanju.
//
// v2 (2026-10-23): Tour dobio polja posade; /lines vraca objekat umesto niza.
const CACHE_BUSTER = "v2";

export function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 24 * 60 * 60 * 1000,
            retry: 1
          }
        }
      })
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: CACHE_BUSTER
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
