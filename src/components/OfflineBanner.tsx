import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { Text, View } from "@/components/ui";
import { getOfflineWriteQueueCount, subscribeOfflineQueueCount } from "@/lib/offline-queue";

export function OfflineBanner() {
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
    void getOfflineWriteQueueCount().then(setQueueCount);
    return subscribeOfflineQueueCount(setQueueCount);
  }, []);

  if (!isConnected) {
    return (
      <View className="bg-amber-100 px-3 py-2">
        <Text className="text-center text-xs font-semibold text-amber-800">
          Nema interneta - promene se čuvaju lokalno
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

  return null;
}
