import { Text, View } from "@/components/ui";

export default function ForgotPasswordScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-slate-950">
      <Text className="text-xl font-semibold text-slate-900 dark:text-slate-100">Zaboravljena lozinka</Text>
      <Text className="mt-2 text-center text-slate-500 dark:text-slate-400">
        Povežite ovaj ekran sa postojećim reset-flow endpointom iz web API-ja.
      </Text>
    </View>
  );
}


