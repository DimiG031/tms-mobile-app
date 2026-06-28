import { useMemo, useState } from "react";
import { Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import { useTheme } from "@/providers/ThemeProvider";

const schema = z.object({
  email: z.string().email("Unesite ispravan email"),
  password: z.string().min(6, "Lozinka je prekratka")
});

type LoginValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const theme = useTheme();
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
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (values: LoginValues) => {
    try {
      await signIn(values.email, values.password);
      router.replace("/(driver)");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Prijava nije uspela";
      Alert.alert("Prijava", message);
    }
  };

  const onBiometricUnlock = async () => {
    try {
      const ok = await unlockWithBiometrics();
      if (ok) {
        router.replace("/(driver)");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Biometrija nije uspela";
      Alert.alert("Biometrija", message);
    }
  };

  if (isHydrating) {
    return <View className="flex-1" style={{ backgroundColor: theme.surface.app }} />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.surface.app }}>
      <View className="rounded-b-3xl px-6 pb-7 pt-11" style={{ backgroundColor: theme.accent.primary }}>
        <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.82)" }}>
          TMS DRIVER
        </Text>
        <Text className="mt-2 text-4xl font-extrabold" style={{ color: theme.text.inverse }}>
          Dobrodošli nazad
        </Text>
        <Text className="mt-1 text-base" style={{ color: "rgba(255,255,255,0.86)" }}>
          Prijavite se nalogom vaše kompanije
        </Text>
      </View>

      <View className="px-6 pb-6 pt-6">
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
          Email adresa
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="vozač@kompanija.rs"
          value={email}
          onChangeText={(v: string) => setValue("email", v, { shouldDirty: true })}
          placeholderTextColor={theme.text.muted}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        {errors.email ? <Text className="mt-1 text-xs text-red-600">{errors.email.message}</Text> : null}

        <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
          Lozinka
        </Text>
        <View className="relative justify-center">
          <TextInput
            secureTextEntry={!showPassword}
            placeholder="Unesite lozinku"
            value={password}
            onChangeText={(v: string) => setValue("password", v, { shouldDirty: true })}
            placeholderTextColor={theme.text.muted}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
            style={{ position: "absolute", right: 10, height: 32, width: 32, alignItems: "center", justifyContent: "center" }}
            accessibilityLabel={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
          >
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={theme.text.muted} />
          </Pressable>
        </View>
        {errors.password ? <Text className="mt-1 text-xs text-red-600">{errors.password.message}</Text> : null}

        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="mt-4 rounded-xl px-4 py-3 disabled:opacity-60"
          style={{ backgroundColor: theme.accent.primary }}
        >
          <Text className="text-center text-lg font-semibold text-white">
            {isSubmitting ? "Prijava..." : "Prijavi se"}
          </Text>
        </Pressable>

        {hasBiometricSession ? (
          <Pressable
            onPress={onBiometricUnlock}
            className="mt-3 rounded-xl border px-4 py-3"
            style={{ borderColor: theme.accent.primary }}
          >
            <Text className="text-center text-base font-semibold" style={{ color: theme.accent.primary }}>
              Otključaj biometrijom
            </Text>
          </Pressable>
        ) : null}

        <Link href="/(auth)/forgot-password" style={{ marginTop: 16, alignSelf: "center" }}>
          <Text className="text-center text-sm" style={{ color: theme.accent.primary }}>
            Zaboravljena lozinka?
          </Text>
        </Link>
      </View>
    </View>
  );
}
