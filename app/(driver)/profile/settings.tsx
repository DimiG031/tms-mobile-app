import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { ActivityIndicator, Alert, ScrollView, Switch } from "react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "@/components/ui";
import { useMobileProfile, useUpdateMobilePreferences } from "@/queries/useMobileProfile";
import { useChangePassword, useUpdateMobileSettings } from "@/queries/useMobileAccount";
import { getModuleDefinition, sortModulesByPreference } from "@/lib/mobile-modules";
import { Theme } from "@/lib/theme";
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
        <Text className="text-sm font-semibold" style={{ color: Theme.text.primary }}>Promena lozinke</Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Trenutna lozinka"
          secureTextEntry
          className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
        />
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Nova lozinka (min. 8 karaktera)"
          secureTextEntry
          className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Potvrdi novu lozinku"
          secureTextEntry
          className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
        />
        <Pressable
          disabled={!canSubmit}
          onPress={onSubmit}
          className="mb-1 mt-3 rounded-xl px-4 py-3"
          style={{ backgroundColor: canSubmit ? Theme.accent.primary : "#cbd5e1" }}
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
  const updateSettings = useUpdateMobileSettings();
  const [theme, setTheme] = useState<MobileThemePreference>((settings.theme as MobileThemePreference) ?? "system");
  const [notifyMobile, setNotifyMobile] = useState(settings.notifyMobile);
  const [notifyEmail, setNotifyEmail] = useState(settings.notifyEmail);

  useEffect(() => {
    setTheme((settings.theme as MobileThemePreference) ?? "system");
    setNotifyMobile(settings.notifyMobile);
    setNotifyEmail(settings.notifyEmail);
  }, [settings]);

  const hasChanges =
    theme !== ((settings.theme as MobileThemePreference) ?? "system") ||
    notifyMobile !== settings.notifyMobile ||
    notifyEmail !== settings.notifyEmail;

  function onSave() {
    updateSettings.mutate(
      { theme, notifyMobile, notifyEmail },
      {
        onSuccess: () => Alert.alert("Podešavanja", "Podešavanja su sačuvana."),
        onError: (error) => Alert.alert("Podešavanja", error instanceof Error ? error.message : "Podešavanja nisu sačuvana.")
      }
    );
  }

  return (
    <Card>
      <View className="py-3" style={{ borderBottomWidth: 1, borderBottomColor: Theme.surface.border }}>
        <Text className="text-sm font-semibold" style={{ color: Theme.text.primary }}>Tema aplikacije</Text>
        <View className="mt-3 flex-row gap-2">
          {THEME_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setTheme(option.value)}
              className={`flex-1 rounded-lg border px-3 py-2 ${theme === option.value ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"}`}
            >
              <Text className={`text-center ${theme === option.value ? "text-brand-700" : "text-slate-700"}`}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="flex-row items-center justify-between py-3" style={{ borderBottomWidth: 1, borderBottomColor: Theme.surface.border }}>
        <Text className="flex-1 pr-4 text-sm font-semibold" style={{ color: Theme.text.primary }}>Push obaveštenja na telefonu</Text>
        <Switch
          value={notifyMobile}
          onValueChange={setNotifyMobile}
          trackColor={{ false: "#cbd5e1", true: "#99f6e4" }}
          thumbColor={notifyMobile ? Theme.accent.primary : "#f8fafc"}
        />
      </View>

      <View className="flex-row items-center justify-between py-3">
        <Text className="flex-1 pr-4 text-sm font-semibold" style={{ color: Theme.text.primary }}>Email obaveštenja</Text>
        <Switch
          value={notifyEmail}
          onValueChange={setNotifyEmail}
          trackColor={{ false: "#cbd5e1", true: "#99f6e4" }}
          thumbColor={notifyEmail ? Theme.accent.primary : "#f8fafc"}
        />
      </View>

      <Pressable
        disabled={!hasChanges || updateSettings.isPending}
        onPress={onSave}
        className="mb-4 mt-1 rounded-xl px-4 py-3"
        style={{ backgroundColor: hasChanges ? Theme.accent.primary : "#cbd5e1" }}
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
  return (
    <View className="overflow-hidden rounded-2xl border px-4" style={{ borderColor: Theme.surface.border, backgroundColor: Theme.surface.card }}>
      {children}
    </View>
  );
}

function SectionHeader({ title }: Readonly<{ title: string }>) {
  return (
    <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: Theme.text.secondary }}>
      {title}
    </Text>
  );
}

function ModuleSettings({ availableModules, preferences }: Readonly<{ availableModules: MobileModuleKey[]; preferences: MobileProfilePreferences }>) {
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
      <View className="py-3" style={{ borderBottomWidth: 1, borderBottomColor: Theme.surface.border }}>
        <Text className="text-sm font-semibold" style={{ color: Theme.text.primary }}>Moduli na pregledu</Text>
        <Text className="mt-1 text-xs leading-5" style={{ color: Theme.text.secondary }}>
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
            style={{ borderBottomWidth: 1, borderBottomColor: Theme.surface.border }}
          >
            <Ionicons
              name={selected ? "checkbox-outline" : "square-outline"}
              size={22}
              color={selected ? Theme.accent.primary : Theme.text.muted}
            />
            <View className="flex-1">
              <Text className="text-sm font-semibold" style={{ color: Theme.text.primary }}>{definition.label}</Text>
              <Text className="mt-0.5 text-xs leading-4" style={{ color: Theme.text.secondary }}>
                {unavailableTab ? `${definition.description} Nema posebnu karticu.` : definition.description}
              </Text>
            </View>
            {definition.fixed ? (
              <Text className="text-xs font-semibold" style={{ color: Theme.text.secondary }}>Fiksno</Text>
            ) : null}
          </Pressable>
        );
      })}

      <View className="py-3" style={{ borderBottomWidth: 1, borderBottomColor: Theme.surface.border }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-sm font-semibold" style={{ color: Theme.text.primary }}>Točak navigacije</Text>
            <Text className="mt-0.5 text-xs leading-4" style={{ color: Theme.text.secondary }}>
              Prikazuje izbor stranica u donjoj navigaciji kada ima više modula.
            </Text>
          </View>
          <Switch
            value={sliceNavigationEnabled}
            onValueChange={setSliceNavigationEnabled}
            trackColor={{ false: "#cbd5e1", true: "#99f6e4" }}
            thumbColor={sliceNavigationEnabled ? Theme.accent.primary : "#f8fafc"}
          />
        </View>
      </View>

      <View className="py-3">
        <Text className="mb-2 text-sm font-semibold" style={{ color: Theme.text.primary }}>Redosled</Text>
        {orderedSelectedModules.map((key, index) => {
          const definition = getModuleDefinition(key);
          const isFixed = Boolean(definition.fixed);
          return (
            <View key={key} className="flex-row items-center py-1">
              <Text className="w-9 text-xs font-semibold" style={{ color: Theme.text.secondary }}>{index + 1}.</Text>
              <Text className="flex-1 text-sm font-semibold" style={{ color: Theme.text.primary }}>{definition.label}</Text>
              {isFixed ? (
                <Text className="text-xs font-semibold" style={{ color: Theme.text.secondary }}>Fiksno</Text>
              ) : (
                <>
                  <Pressable
                    disabled={index <= 1}
                    onPress={() => moveModule(key, -1)}
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{ opacity: index <= 1 ? 0.35 : 1 }}
                  >
                    <Ionicons name="chevron-up" size={18} color={Theme.accent.primary} />
                  </Pressable>
                  <Pressable
                    disabled={index >= orderedSelectedModules.length - 2}
                    onPress={() => moveModule(key, 1)}
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{ opacity: index >= orderedSelectedModules.length - 2 ? 0.35 : 1 }}
                  >
                    <Ionicons name="chevron-down" size={18} color={Theme.accent.primary} />
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
        style={{ backgroundColor: hasChanges ? Theme.accent.primary : "#cbd5e1" }}
      >
        <Text className="text-center font-semibold" style={{ color: "#fff" }}>
          {updatePreferences.isPending ? "Čuvanje..." : "Sačuvaj podešavanja"}
        </Text>
      </Pressable>
    </Card>
  );
}

export default function ProfileSettingsScreen() {
  const mobileProfileQuery = useMobileProfile();
  const profile = mobileProfileQuery.data;

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: Theme.surface.app }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Podešavanja" }} />
      <Text className="text-3xl font-extrabold" style={{ color: Theme.text.primary }}>Podešavanja</Text>
      <Text className="mt-1 text-sm" style={{ color: Theme.text.secondary }}>
        Navigacija, nalog i korisnička podešavanja.
      </Text>

      {mobileProfileQuery.isLoading ? (
        <ActivityIndicator color={Theme.accent.primary} style={{ marginVertical: 24 }} />
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
