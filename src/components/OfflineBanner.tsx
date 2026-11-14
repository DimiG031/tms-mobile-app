import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { Text, View } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { getUnownedOfflineWriteCount, getOfflineWriteQueueCount, subscribeOfflineQueueCount } from "@/lib/offline-queue";

export function OfflineBanner() {
  const { session } = useAuth();
  const [hasUnowned, setHasUnowned] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(Boolean(state.isConnected));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setQueueCount(0);
    setHasUnowned(false);
    const refresh = () => {
      void Promise.all([getOfflineWriteQueueCount(), getUnownedOfflineWriteCount()])
        .then(([count, legacy]) => { if (active) { setQueueCount(count); setHasUnowned(legacy > 0); } })
        .catch(() => undefined);
    };
    refresh();
    const unsubscribe = subscribeOfflineQueueCount(refresh);
    return () => { active = false; unsubscribe(); };
  }, [session?.user.id, session?.user.companyId, session?.user.driverId]);

  if (!isConnected) {
    return (
      <View className="bg-amber-100 px-3 py-2">
        <Text className="text-center text-xs font-semibold text-amber-800">
          Nema interneta — podržani zahtevi čekaju slanje; novi fajlovi zahtevaju vezu.
        </Text>
      </View>
    );
  }

  if (queueCount > 0) {
    return (
      <View className="bg-sky-100 px-3 py-2">
        <Text className="text-center text-xs font-semibold text-sky-800">
          Sinhronizacija... ({queueCount})
        </Text>
      </View>
    );
  }

  if (hasUnowned) {
    return (
      <View className="bg-amber-100 px-3 py-2">
        <Text className="text-center text-xs font-semibold text-amber-800">
          Postoje stari zahtevi bez potvrđenog vlasnika. Nisu poslati i zahtevaju proveru.
        </Text>
      </View>
    );
  }
  return null;
}

