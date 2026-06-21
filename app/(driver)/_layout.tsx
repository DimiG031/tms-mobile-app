import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { PanResponder, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/providers/AuthProvider";
import { useMobileProfile } from "@/queries/useMobileProfile";
import {
  getModuleDefinition,
  getSliceModules,
  getVisibleTabModules,
  type MobileModuleDefinition
} from "@/lib/mobile-modules";
import { useTheme } from "@/providers/ThemeProvider";
import type { MobileProfile } from "@/lib/types";

type IconName = ComponentProps<typeof Ionicons>["name"];
type IconProps = Readonly<{ color: string; size?: number }>;
type RouteItem = { key: string; name: string };
type TabBarProps = {
  state: { index: number; routes: RouteItem[] };
  navigation: { navigate: (name: string) => void };
};

const TOP_LEVEL_TAB_ROUTES = ["index", "tours", "chat", "notifications", "documents", "rokovnik", "more", "profile"];

function makeTabIcon(name: IconName) {
  return function TabIcon({ color, size }: IconProps) {
    return <Ionicons name={name} size={size ?? 20} color={color} />;
  };
}

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function BottomNavItem({
  label,
  icon,
  active,
  onPress
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const color = active ? theme.accent.primary : theme.text.muted;

  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 54 }}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={{ marginTop: 2, fontSize: 11, fontWeight: "600", color }}>{label}</Text>
    </Pressable>
  );
}

function ModuleWheel({
  modules,
  activeIndex,
  onRotate,
  onSelect
}: {
  modules: MobileModuleDefinition[];
  activeIndex: number;
  onRotate: (direction: -1 | 1) => void;
  onSelect: (index: number) => void;
}) {
  const theme = useTheme();
  const activeModule = modules[wrapIndex(activeIndex, modules.length)];
  const previousModule = modules[wrapIndex(activeIndex - 1, modules.length)];
  const nextModule = modules[wrapIndex(activeIndex + 1, modules.length)];
  const previousIndex = wrapIndex(activeIndex - 1, modules.length);
  const nextIndex = wrapIndex(activeIndex + 1, modules.length);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 26) {
            onRotate(-1);
          } else if (gesture.dx < -26) {
            onRotate(1);
          }
        }
      }),
    [onRotate]
  );

  if (!activeModule) return null;

  return (
    <View
      style={{
        marginHorizontal: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.surface.border,
        borderRadius: 22,
        backgroundColor: theme.surface.card,
        overflow: "hidden",
        height: 154
      }}
      {...panResponder.panHandlers}
    >
      <View
        style={{
          position: "absolute",
          alignSelf: "center",
          top: 38,
          width: 285,
          height: 285,
          borderRadius: 142.5,
          borderWidth: 1,
          borderColor: theme.surface.border,
          backgroundColor: theme.surface.subtle
        }}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 102,
            width: 80,
            height: 5,
            borderRadius: 999,
            backgroundColor: theme.accent.primary
          }}
        />

        {previousModule ? (
          <Pressable
            onPress={() => onSelect(previousIndex)}
            style={{ position: "absolute", left: 28, top: 35, width: 82, alignItems: "center", opacity: 0.46 }}
          >
            <View style={{ height: 45, width: 45, borderRadius: 22.5, alignItems: "center", justifyContent: "center", backgroundColor: theme.accent.primaryLight }}>
              <Ionicons name={previousModule.icon} size={20} color={theme.accent.primary} />
            </View>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => onSelect(activeIndex)}
          style={{ position: "absolute", left: 88.5, top: 5, width: 108, alignItems: "center" }}
        >
          <View style={{ height: 62, width: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: theme.accent.primary }}>
            <Ionicons name={activeModule.icon} size={29} color="#fff" />
          </View>
          <Text numberOfLines={1} style={{ marginTop: 6, fontSize: 14, fontWeight: "800", color: theme.text.primary }}>
            {activeModule.label}
          </Text>
        </Pressable>

        {nextModule ? (
          <Pressable
            onPress={() => onSelect(nextIndex)}
            style={{ position: "absolute", right: 28, top: 35, width: 82, alignItems: "center", opacity: 0.46 }}
          >
            <View style={{ height: 45, width: 45, borderRadius: 22.5, alignItems: "center", justifyContent: "center", backgroundColor: theme.accent.primaryLight }}>
              <Ionicons name={nextModule.icon} size={20} color={theme.accent.primary} />
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function DriverTabBar({ state, navigation, profile }: TabBarProps & { profile?: MobileProfile | null }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const visibleTabs = getVisibleTabModules(profile);
  const sliceModules = getSliceModules(profile);
  const isSliceMode = Boolean(profile?.preferences.sliceNavigationEnabled && sliceModules.length > 0 && visibleTabs.some((module) => module.key === "more"));
  const [wheelOpen, setWheelOpen] = useState(false);
  const [activeWheelIndex, setActiveWheelIndex] = useState(0);

  const currentRouteName = state.routes[state.index]?.name;
  const tabs = useMemo(
    () => visibleTabs.filter((module) => module.routeName),
    [visibleTabs]
  );

  function openModule(module: MobileModuleDefinition) {
    if (!module.routeName) return;
    setWheelOpen(false);
    navigation.navigate(module.routeName);
  }

  function selectWheelModule(index: number) {
    const normalizedIndex = wrapIndex(index, sliceModules.length);
    if (normalizedIndex === activeWheelIndex) {
      const activeModule = sliceModules[normalizedIndex];
      if (activeModule) openModule(activeModule);
      return;
    }
    setActiveWheelIndex(normalizedIndex);
  }

  return (
    <View style={{ backgroundColor: "transparent" }}>
      {isSliceMode && wheelOpen ? (
        <ModuleWheel
          modules={sliceModules}
          activeIndex={activeWheelIndex}
          onRotate={(direction) => setActiveWheelIndex((current) => wrapIndex(current + direction, sliceModules.length))}
          onSelect={selectWheelModule}
        />
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopWidth: 1,
          borderTopColor: theme.surface.border,
          backgroundColor: theme.surface.card
        }}
      >
        {tabs.map((module) => {
          const routeName = module.routeName ?? module.key;
          const active = module.key === "more" ? wheelOpen : currentRouteName === routeName;

          return (
            <BottomNavItem
              key={routeName}
              label={module.label}
              icon={module.icon}
              active={active}
              onPress={() => {
                if (module.key === "more") {
                  setWheelOpen((current) => !current);
                  return;
                }
                openModule(module);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function DriverLayout() {
  const theme = useTheme();
  const { session } = useAuth();
  const mobileProfileQuery = useMobileProfile(Boolean(session));
  const visibleTabs = getVisibleTabModules(mobileProfileQuery.data);
  const visibleRouteNames = new Set(visibleTabs.map((module) => module.routeName));

  if (!session) {
    return null;
  }

  return (
    <Tabs
      tabBar={(props) => <DriverTabBar {...props} profile={mobileProfileQuery.data} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent.primary,
        tabBarInactiveTintColor: theme.text.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600"
        },
        tabBarStyle: {
          backgroundColor: theme.surface.card,
          borderTopColor: theme.surface.border
        }
      }}
    >
      {TOP_LEVEL_TAB_ROUTES.map((routeName) => {
        const module = visibleTabs.find((item) => item.routeName === routeName) ?? getModuleDefinition(routeName === "index" ? "home" : routeName);
        const isVisible = visibleRouteNames.has(routeName);
        return (
          <Tabs.Screen
            key={routeName}
            name={routeName}
            options={
              isVisible
                ? { title: module.label, tabBarIcon: makeTabIcon(module.icon) }
                : { href: null }
            }
          />
        );
      })}
      <Tabs.Screen name="istorija" options={{ href: null }} />
    </Tabs>
  );
}
