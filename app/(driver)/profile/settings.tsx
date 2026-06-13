import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { ActivityIndicator, Alert, ScrollView, Switch } from "react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import { useMobileProfile, useUpdateMobilePreferences } from "@/queries/useMobileProfile";
import { useChangePassword, useUpdateMobileSettings } from "@/queries/useMobileAccount";
import { getModuleDefinition, sortModulesByPreference } from "@/lib/mobile-modules";
import { useTheme } from "@/providers/ThemeProvider";
import type {
  MobileModuleKey,
  MobileProfilePreferences,
  MobileProfileSettings,
  MobileThemePreference
} from "@/lib/types";

const THEME_OPTIONS: { value: MobileThemePreference; label: string }[] = [
  { value: "system", label: "Sistemska" },
  { value: "light", label: "Svetla" },
  { value: "dark", label: "Tamna" }
];

function PasswordSection() {
  const theme = useTheme();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function onSubmit() {
    if (newPassword.length < 8) {
      Alert.alert("Promena lozinke", "Nova lozinka mora imati najmanje 8 karaktera.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Promena lozinke", "Nova lozinka i potvrda se ne poklapaju.");
      return;
    }
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          Alert.alert("Promena lozinke", "Lozinka je uspešno promenjena.");
        },
        onError: (error) => {
          Alert.alert("Promena lozinke", error instanceof Error ? error.message : "Promena lozinke nije uspela.");
        }
      }
    );
  }

  const canSubmit = Boolean(currentPassword && newPassword && confirmPassword) && !changePassword.isPending;

  return (
    <Card>
      <View className="py-3">
        <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>Promena lozinke</Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Trenutna lozinka"
          placeholderTextColor={theme.text.muted}
          secureTextEntry
          className="mt-3 rounded-xl border px-4 py-3"
          style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card, color: theme.text.primary }}
        />
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Nova lozinka (min. 8 karaktera)"
          placeholderTextColor={theme.text.muted}
          secureTextEntry
          className="mt-2 rounded-xl border px-4 py-3"
          style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card, color: theme.text.primary }}
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Potvrdi novu lozinku"
          placeholderTextColor={theme.text.muted}
          secureTextEntry
          className="mt-2 rounded-xl border px-4 py-3"
          style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card, color: theme.text.primary }}
        />
        <Pressable
          disabled={!canSubmit}
          onPress={onSubmit}
          className="mb-1 mt-3 rounded-xl px-4 py-3"
          style={{ backgroundColor: canSubmit ? theme.accent.primary : "#cbd5e1" }}
        >
          <Text className="text-center font-semibold text-white">
            {changePassword.isPending ? "Čuvanje..." : "Promeni lozinku"}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

function AppearanceSection({ settings }: Readonly<{ settings: MobileProfileSettings }>) {
  const theme = useTheme();
  const updateSettings = useUpdateMobileSettings();
  const [themePref, setThemePref] = useState<MobileThemePreference>((settings.theme as MobileThemePreference) ?? "system");
  const [notifyMobile, setNotifyMobile] = useState(settings.notifyMobile);
  const [notifyEmail, setNotifyEmail] = useState(settings.notifyEmail);

  useEffect(() => {
    setThemePref((settings.theme as MobileThemePreference) ?? "system");
    setNotifyMobile(settings.notifyMobile);
    setNotifyEmail(settings.notifyEmail);
  }, [settings]);

  const hasChanges =
    themePref !== ((settings.theme as MobileThemePreference) ?? "system") ||
    notifyMobile !== settings.notifyMobile ||
    notifyEmail !== settings.notifyEmail;

  function onSave() {
    updateSettings.mutate(
      { theme: themePref, notifyMobile, notifyEmail },
      {
        onSuccess: () => Alert.alert("Podešavanja", "Podešavanja su sačuvana."),
        onError: (error) => Alert.alert("Podešavanja", error instanceof Error ? error.message : "Podešavanja nisu sačuvana.")
      }
    );
  }

  return (
    <Card>
      <View className="py-3" style={{ borderBottomWidth: 1, borderBottomColor: theme.surface.border }}>
        <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>Tema aplikacije</Text>
        <View className="mt-3 flex-row gap-2">
          {THEME_OPTIONS.map((option) => {
            const selected = themePref === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setThemePref(option.value)}
                className="flex-1 rounded-lg border px-3 py-2"
                style={{
                  borderColor: selected ? theme.accent.primary : theme.surface.border,
                  backgroundColor: selected ? theme.accent.primaryLight : theme.surface.card
                }}
              >
                <Text className="text-center" style={{ color: selected ? theme.accent.primaryDark : theme.text.secondary }}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="flex-row items-center justify-between py-3" style={{ borderBottomWidth: 1, borderBottomColor: theme.surface.border }}>
        <Text className="flex-1 pr-4 text-sm font-semibold" style={{ color: theme.text.primary }}>Push obaveštenja na telefonu</Text>
        <Switch
          value={notifyMobile}
          onValueChange={setNotifyMobile}
          trackColor={{ false: "#cbd5e1", true: "#99f6e4" }}
          thumbColor={notifyMobile ? theme.accent.primary : "#f8fafc"}
        />
      </View>

      <View className="flex-row items-center justify-between py-3">
        <Text className="flex-1 pr-4 text-sm font-semibold" style={{ color: theme.text.primary }}>Email obaveštenja</Text>
        <Switch
          value={notifyEmail}
          onValueChange={setNotifyEmail}
          trackColor={{ false: "#cbd5e1", true: "#99f6e4" }}
          thumbColor={notifyEmail ? theme.accent.primary : "#f8fafc"}
        />
      </View>

      <Pressable
        disabled={!hasChanges || updateSettings.isPending}
        onPress={onSave}
        className="mb-4 mt-1 rounded-xl px-4 py-3"
        style={{ backgroundColor: hasChanges ? theme.accent.primary : "#cbd5e1" }}
      >
        <Text className="text-center font-semibold text-white">
          {updateSettings.isPending ? "Čuvanje..." : "Sačuvaj podešavanja"}
        </Text>
      </Pressable>
    </Card>
  );
}

const MAX_SELECTED_MODULES = 8;

function sameList(a: MobileModuleKey[], b: MobileModuleKey[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function Card({ children }: Readonly<{ children: ReactNode }>) {
  const theme = useTheme();
  return (
    <View className="overflow-hidden rounded-2xl border px-4" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
      {children}
    </View>
  );
}

function SectionHeader({ title }: Readonly<{ title: string }>) {
  const theme = useTheme();
  return (
    <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: theme.text.secondary }}>
      {title}
    </Text>
  );
}

function ModuleSettings({ availableModules, preferences }: Readonly<{ availableModules: MobileModuleKey[]; preferences: MobileProfilePreferences }>) {
  const theme = useTheme();
  const updatePreferences = useUpdateMobilePreferences();
  const availableSet = useMemo(() => new Set(availableModules), [availableModules]);
  const fixedKeys = useMemo(() => availableModules.filter((key) => getModuleDefinition(key).fixed), [availableModules]);
  const [selectedModules, setSelectedModules] = useState<MobileModuleKey[]>(preferences.selectedModules);
  const [moduleOrder, setModuleOrder] = useState<MobileModuleKey[]>(preferences.moduleOrder);
  const [sliceNavigationEnabled, setSliceNavigationEnabled] = useState(preferences.sliceNavigationEnabled);

  useEffect(() => {
    setSelectedModules(preferences.selectedModules);
    setModuleOrder(preferences.moduleOrder);
    setSliceNavigationEnabled(preferences.sliceNavigationEnabled);
  }, [preferences]);

  const orderedSelectedModules = useMemo(() => {
    const fixedStart = selectedModules.filter((key) => getModuleDefinition(key).fixed && key === "home");
    const fixedEnd = selectedModules.filter((key) => getModuleDefinition(key).fixed && key !== "home");
    const movable = sortModulesByPreference(
      selectedModules.filter((key) => !getModuleDefinition(key).fixed),
      moduleOrder
    );
    return [...fixedStart, ...movable, ...fixedEnd];
  }, [moduleOrder, selectedModules]);

  const hasChanges =
    !sameList(selectedModules, preferences.selectedModules) ||
    !sameList(moduleOrder, preferences.moduleOrder) ||
    sliceNavigationEnabled !== preferences.sliceNavigationEnabled;

  function toggleModule(key: MobileModuleKey) {
    const definition = getModuleDefinition(key);
    if (definition.fixed) return;

    setSelectedModules((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= MAX_SELECTED_MODULES) {
        Alert.alert("Podešavanja", `Možete izabrati najviše ${MAX_SELECTED_MODULES} modula.`);
        return current;
      }
      return [...current, key];
    });
    setModuleOrder((current) => (current.includes(key) ? current : [...current, key]));
  }

  function moveModule(key: MobileModuleKey, direction: -1 | 1) {
    if (getModuleDefinition(key).fixed) return;

    setModuleOrder((current) => {
      const currentOrder = sortModulesByPreference(
        selectedModules.filter((item) => !getModuleDefinition(item).fixed),
        current
      );
      const index = currentOrder.indexOf(key);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= currentOrder.length) return current;

      const nextOrder = [...currentOrder];
      const [item] = nextOrder.splice(index, 1);
      nextOrder.splice(nextIndex, 0, item);
      const fixedStart = selectedModules.filter((itemKey) => getModuleDefinition(itemKey).fixed && itemKey === "home");
      const fixedEnd = selectedModules.filter((itemKey) => getModuleDefinition(itemKey).fixed && itemKey !== "home");
      return [...fixedStart, ...nextOrder, ...fixedEnd];
    });
  }

  async function savePreferences() {
    const normalizedSelected = selectedModules.filter((key) => availableSet.has(key));
    const withFixed = Array.from(new Set([...fixedKeys, ...normalizedSelected]));
    const normalizedOrder = orderedSelectedModules.filter((key) => withFixed.includes(key));

    try {
      await updatePreferences.mutateAsync({
        selectedModules: withFixed,
        moduleOrder: normalizedOrder,
        sliceNavigationEnabled
      });
      Alert.alert("Podešavanja", "Podešavanja navigacije su sačuvana.");
    } catch (error) {
      Alert.alert("Podešavanja", error instanceof Error ? error.message : "Podešavanja nisu sačuvana.");
    }
  }

  return (
    <Card>
      <View className="py-3" style={{ borderBottomWidth: 1, borderBottomColor: theme.surface.border }}>
        <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>Moduli na pregledu</Text>
        <Text className="mt-1 text-xs leading-5" style={{ color: theme.text.secondary }}>
          Izaberite do 8 modula. Početna i Profil ostaju fiksni.
        </Text>
      </View>

      {availableModules.map((key) => {
        const definition = getModuleDefinition(key);
        const selected = selectedModules.includes(key) || Boolean(definition.fixed);
        const unavailableTab = !definition.routeName;
        return (
          <Pressable
            key={key}
            onPress={() => toggleModule(key)}
            className="flex-row items-center gap-3 py-3"
            style={{ borderBottomWidth: 1, borderBottomColor: theme.surface.border }}
          >
            <Ionicons
              name={selected ? "checkbox-outline" : "square-outline"}
              size={22}
              color={selected ? theme.accent.primary : theme.text.muted}
            />
            <View className="flex-1">
              <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>{definition.label}</Text>
              <Text className="mt-0.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
                {unavailableTab ? `${definition.description} Nema posebnu karticu.` : definition.description}
              </Text>
            </View>
            {definition.fixed ? (
              <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>Fiksno</Text>
            ) : null}
          </Pressable>
        );
      })}

      <View className="py-3" style={{ borderBottomWidth: 1, borderBottomColor: theme.surface.border }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>Točak navigacije</Text>
            <Text className="mt-0.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
              Prikazuje izbor stranica u donjoj navigaciji kada ima više modula.
            </Text>
          </View>
          <Switch
            value={sliceNavigationEnabled}
            onValueChange={setSliceNavigationEnabled}
            trackColor={{ false: "#cbd5e1", true: "#99f6e4" }}
            thumbColor={sliceNavigationEnabled ? theme.accent.primary : "#f8fafc"}
          />
        </View>
      </View>

      <View className="py-3">
        <Text className="mb-2 text-sm font-semibold" style={{ color: theme.text.primary }}>Redosled</Text>
        {orderedSelectedModules.map((key, index) => {
          const definition = getModuleDefinition(key);
          const isFixed = Boolean(definition.fixed);
          return (
            <View key={key} className="flex-row items-center py-1">
              <Text className="w-9 text-xs font-semibold" style={{ color: theme.text.secondary }}>{index + 1}.</Text>
              <Text className="flex-1 text-sm font-semibold" style={{ color: theme.text.primary }}>{definition.label}</Text>
              {isFixed ? (
                <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>Fiksno</Text>
              ) : (
                <>
                  <Pressable
                    disabled={index <= 1}
                    onPress={() => moveModule(key, -1)}
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{ opacity: index <= 1 ? 0.35 : 1 }}
                  >
                    <Ionicons name="chevron-up" size={18} color={theme.accent.primary} />
                  </Pressable>
                  <Pressable
                    disabled={index >= orderedSelectedModules.length - 2}
                    onPress={() => moveModule(key, 1)}
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{ opacity: index >= orderedSelectedModules.length - 2 ? 0.35 : 1 }}
                  >
                    <Ionicons name="chevron-down" size={18} color={theme.accent.primary} />
                  </Pressable>
                </>
              )}
            </View>
          );
        })}
      </View>

      <Pressable
        disabled={!hasChanges || updatePreferences.isPending}
        onPress={() => void savePreferences()}
        className="mb-4 mt-1 rounded-xl px-4 py-3"
        style={{ backgroundColor: hasChanges ? theme.accent.primary : "#cbd5e1" }}
      >
        <Text className="text-center font-semibold" style={{ color: "#fff" }}>
          {updatePreferences.isPending ? "Čuvanje..." : "Sačuvaj podešavanja"}
        </Text>
      </Pressable>
    </Card>
  );
}

export default function ProfileSettingsScreen() {
  const theme = useTheme();
  const mobileProfileQuery = useMobileProfile();
  const profile = mobileProfileQuery.data;

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: theme.surface.app }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Podešavanja" }} />
      <Text className="text-3xl font-extrabold" style={{ color: theme.text.primary }}>Podešavanja</Text>
      <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>
        Navigacija, nalog i korisnička podešavanja.
      </Text>

      {mobileProfileQuery.isLoading ? (
        <ActivityIndicator color={theme.accent.primary} style={{ marginVertical: 24 }} />
      ) : null}

      {profile ? (
        <>
          <SectionHeader title="Navigacija" />
          <ModuleSettings availableModules={profile.availableMobileModules} preferences={profile.preferences} />

          <SectionHeader title="Izgled i obaveštenja" />
          <AppearanceSection settings={profile.settings} />

          <SectionHeader title="Nalog" />
          <PasswordSection />
        </>
      ) : null}
    </ScrollView>
  );
}
