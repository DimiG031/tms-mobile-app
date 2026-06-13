import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PanResponder, ScrollView, useWindowDimensions } from "react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "@/components/ui";
import { useMobileProfile } from "@/queries/useMobileProfile";
import { getSliceModules } from "@/lib/mobile-modules";
import { useTheme } from "@/providers/ThemeProvider";

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export default function MoreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const mobileProfileQuery = useMobileProfile();
  const modules = getSliceModules(mobileProfileQuery.data);
  const [activeIndex, setActiveIndex] = useState(0);
  const wheelSize = Math.min(width - 48, 340);

  const activeModule = modules[wrapIndex(activeIndex, modules.length)];
  const previousModule = modules[wrapIndex(activeIndex - 1, modules.length)];
  const nextModule = modules[wrapIndex(activeIndex + 1, modules.length)];

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 16 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 28) {
            setActiveIndex((current) => wrapIndex(current - 1, modules.length));
          } else if (gesture.dx < -28) {
            setActiveIndex((current) => wrapIndex(current + 1, modules.length));
          }
        }
      }),
    [modules.length]
  );

  function openActiveModule() {
    if (!activeModule?.routeName) return;
    router.push(`/(driver)/${activeModule.routeName}` as never);
  }

  function rotate(direction: -1 | 1) {
    setActiveIndex((current) => wrapIndex(current + direction, modules.length));
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.surface.app }}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="px-4 pb-2 pt-5">
        <Text className="text-4xl font-extrabold" style={{ color: theme.text.primary }}>
          Više
        </Text>
        <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>
          Okrenite točak i otvorite izabranu stranicu
        </Text>
      </View>

      <View className="px-4 pt-5">
        {modules.length === 0 ? (
          <View className="rounded-2xl border px-4 py-5" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
            <Text className="font-semibold" style={{ color: theme.text.primary }}>Nema dodatnih modula</Text>
            <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>
              Izaberite module u podešavanjima profila.
            </Text>
          </View>
        ) : (
          <>
            <View
              className="items-center overflow-hidden rounded-3xl border"
              style={{ height: 178, borderColor: theme.surface.border, backgroundColor: theme.surface.card }}
              {...panResponder.panHandlers}
            >
              <View
                className="absolute items-center rounded-full border"
                style={{
                  top: 44,
                  width: wheelSize,
                  height: wheelSize,
                  borderColor: theme.surface.border,
                  backgroundColor: theme.surface.subtle
                }}
              >
                <View
                  className="absolute top-0 h-1.5 w-20 rounded-full"
                  style={{ left: wheelSize / 2 - 40, backgroundColor: theme.accent.primary }}
                />

                {previousModule ? (
                  <Pressable
                    onPress={() => rotate(-1)}
                    className="absolute items-center"
                    style={{ left: 18, top: 42, width: 92, opacity: 0.48 }}
                  >
                    <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: theme.accent.primaryLight }}>
                      <Ionicons name={previousModule.icon} size={22} color={theme.accent.primary} />
                    </View>
                    <Text className="mt-1 text-center text-xs font-bold" style={{ color: theme.text.primary }} numberOfLines={1}>
                      {previousModule.label}
                    </Text>
                  </Pressable>
                ) : null}

                {activeModule ? (
                  <Pressable
                    onPress={openActiveModule}
                    className="absolute items-center"
                    style={{ left: wheelSize / 2 - 54, top: 8, width: 108 }}
                  >
                    <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: theme.accent.primary }}>
                      <Ionicons name={activeModule.icon} size={30} color="#fff" />
                    </View>
                    <Text className="mt-2 text-center text-sm font-extrabold" style={{ color: theme.text.primary }} numberOfLines={1}>
                      {activeModule.label}
                    </Text>
                  </Pressable>
                ) : null}

                {nextModule ? (
                  <Pressable
                    onPress={() => rotate(1)}
                    className="absolute items-center"
                    style={{ right: 18, top: 42, width: 92, opacity: 0.48 }}
                  >
                    <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: theme.accent.primaryLight }}>
                      <Ionicons name={nextModule.icon} size={22} color={theme.accent.primary} />
                    </View>
                    <Text className="mt-1 text-center text-xs font-bold" style={{ color: theme.text.primary }} numberOfLines={1}>
                      {nextModule.label}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View className="mt-5 rounded-2xl border px-4 py-4" style={{ borderColor: theme.surface.border, backgroundColor: theme.surface.card }}>
              <View className="flex-row items-center">
                <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: theme.accent.primaryLight }}>
                  <Ionicons name={activeModule.icon} size={24} color={theme.accent.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-extrabold" style={{ color: theme.text.primary }}>
                    {activeModule.label}
                  </Text>
                  <Text className="mt-0.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
                    {activeModule.description}
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row gap-3">
                <Pressable
                  onPress={() => rotate(-1)}
                  className="h-12 w-12 items-center justify-center rounded-xl border"
                  style={{ borderColor: theme.surface.border }}
                >
                  <Ionicons name="chevron-back" size={22} color={theme.accent.primary} />
                </Pressable>
                <Pressable
                  onPress={openActiveModule}
                  className="h-12 flex-1 items-center justify-center rounded-xl"
                  style={{ backgroundColor: theme.accent.primary }}
                >
                  <Text className="font-semibold text-white">Otvori</Text>
                </Pressable>
                <Pressable
                  onPress={() => rotate(1)}
                  className="h-12 w-12 items-center justify-center rounded-xl border"
                  style={{ borderColor: theme.surface.border }}
                >
                  <Ionicons name="chevron-forward" size={22} color={theme.accent.primary} />
                </Pressable>
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
