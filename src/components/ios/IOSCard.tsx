import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { Radius, Shadows } from "@/lib/theme";
import { useTheme } from "@/providers/ThemeProvider";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  glass?: boolean;
  padded?: boolean;
};

export function IOSCard({ children, style, glass = false, padded = true }: Props) {
  const theme = useTheme();
  const base: StyleProp<ViewStyle> = [styles.card, padded ? styles.padded : null, style];

  if (glass && Platform.OS === "ios") {
    return (
      <BlurView intensity={62} tint={theme.isDark ? "dark" : "light"} style={base}>
        <View
          style={{
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.surface.border,
            backgroundColor: theme.isDark ? "rgba(17,28,46,0.55)" : "rgba(255,255,255,0.72)"
          }}
        >
          {children}
        </View>
      </BlurView>
    );
  }

  return (
    <View
      style={[
        base,
        {
          backgroundColor: theme.surface.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.surface.border
        }
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    ...Shadows.card
  },
  padded: {
    padding: 14
  }
});
