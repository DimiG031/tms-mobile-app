import { Redirect } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";

export default function Index() {
  const { isHydrating, isAuthenticated } = useAuth();

  if (isHydrating) {
    return null;
  }

  return <Redirect href={isAuthenticated ? "/(driver)" : "/login"} />;
}


