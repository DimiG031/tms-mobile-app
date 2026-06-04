import { View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";

export default function Index() {
  const { isHydrating, isAuthenticated } = useAuth();

  if (isHydrating) {
    return <View style={{ flex: 1, backgroundColor: "#0f2c4a" }} />;
  }

  return <Redirect href={isAuthenticated ? "/(driver)" : "/login"} />;
}


