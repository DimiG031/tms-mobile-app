import { useMemo } from "react";
import { Alert } from "react-native";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { Pressable, Text, TextInput, View } from "@/components/ui";

const schema = z.object({
  email: z.string().email("Unesite ispravan email"),
  password: z.string().min(6, "Lozinka je prekratka")
});

type LoginValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const { signIn, isHydrating, hasBiometricSession, unlockWithBiometrics } = useAuth();
  const defaultValues = useMemo<LoginValues>(() => ({ email: "", password: "" }), []);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues
  });

  const email = watch("email");
  const password = watch("password");

  const onSubmit = async (values: LoginValues) => {
    try {
      await signIn(values.email, values.password);
      router.replace("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Prijava nije uspela";
      Alert.alert("Greška pri prijavi", message);
    }
  };

  const onBiometricUnlock = async () => {
    try {
      const ok = await unlockWithBiometrics();
      if (ok) {
        router.replace("/");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Biometrijsko otključavanje nije uspelo";
      Alert.alert("Biometrijska greška", message);
    }
  };

  if (isHydrating) {
    return <View className="flex-1 bg-white" />;
  }

  return (
    <View className="flex-1 justify-center bg-brand-50 px-6">
      <View className="rounded-2xl bg-white p-6 shadow-sm">
        <Text className="text-2xl font-bold text-brand-700">Prijava vozača</Text>
        <Text className="mt-1 text-sm text-slate-500">Prijavite se nalogom svoje kompanije.</Text>

        <View className="mt-6 gap-3">
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            value={email}
            onChangeText={(v: string) => setValue("email", v, { shouldDirty: true })}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          />
          {errors.email ? <Text className="text-xs text-red-500">{errors.email.message}</Text> : null}

          <TextInput
            secureTextEntry
            placeholder="Lozinka"
            value={password}
            onChangeText={(v: string) => setValue("password", v, { shouldDirty: true })}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          />
          {errors.password ? <Text className="text-xs text-red-500">{errors.password.message}</Text> : null}

          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="rounded-xl bg-brand-600 px-4 py-3"
          >
            <Text className="text-center font-semibold text-white">
              {isSubmitting ? "Prijava..." : "Prijavi se"}
            </Text>
          </Pressable>

          {hasBiometricSession ? (
            <Pressable onPress={onBiometricUnlock} className="rounded-xl border border-brand-500 px-4 py-3">
              <Text className="text-center font-semibold text-brand-600">Otključaj biometrijom</Text>
            </Pressable>
          ) : null}
        </View>

        <Link href="/forgot-password" style={{ marginTop: 16, alignSelf: "center" }}>
          <Text className="text-center text-sm text-brand-600">Zaboravljena lozinka?</Text>
        </Link>
      </View>
    </View>
  );
}

