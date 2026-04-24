import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LightTokens as T, Radius, Shadows } from "@/lib/theme";

type Variant = "default" | "accent" | "warning" | "danger" | "success";
type Size = "sm" | "md";

type Props = {
  label: string;
  icon?: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: Variant;
  size?: Size;
  style?: StyleProp<ViewStyle>;
};

const palette: Record<Variant, { bg: string; border: string; text: string }> = {
  default: { bg: "rgba(255,255,255,0.58)", border: "rgba(255,255,255,0.55)", text: T.textPrimary },
  accent: { bg: "rgba(13,125,114,0.22)", border: "rgba(13,125,114,0.35)", text: T.accentDark },
  warning: { bg: "rgba(245,158,11,0.2)", border: "rgba(245,158,11,0.35)", text: "#92400e" },
  danger: { bg: "rgba(220,38,38,0.15)", border: "rgba(220,38,38,0.3)", text: "#b91c1c" },
  success: { bg: "rgba(22,163,74,0.18)", border: "rgba(22,163,74,0.32)", text: "#166534" }
};

const sizeMap: Record<Size, { px: number; py: number; fs: number }> = {
  sm: { px: 12, py: 7, fs: 12 },
  md: { px: 16, py: 10, fs: 14 }
};

export function IOSGlassPill({
  label,
  icon,
  onPress,
  disabled = false,
  variant = "default",
  size = "md",
  style
}: Props) {
  const color = palette[variant];
  const s = sizeMap[size];
  const interactive = Boolean(onPress) && !disabled;

  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      style={({ pressed }) => [styles.container, Shadows.glass, style, pressed && interactive ? styles.pressed : null, disabled ? styles.disabled : null]}
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={55} tint="light" style={[styles.blur, { backgroundColor: color.bg }]}>
          <View style={[styles.inner, { borderColor: color.border, paddingHorizontal: s.px, paddingVertical: s.py }]}>
            {icon ? <Text style={styles.icon}>{icon}</Text> : null}
            <Text style={[styles.label, { color: color.text, fontSize: s.fs }]}>{label}</Text>
          </View>
        </BlurView>
      ) : (
        <View style={[styles.blur, { backgroundColor: T.glassBgAndroid }]}>
          <View style={[styles.inner, { borderColor: color.border, paddingHorizontal: s.px, paddingVertical: s.py }]}>
            {icon ? <Text style={styles.icon}>{icon}</Text> : null}
            <Text style={[styles.label, { color: color.text, fontSize: s.fs }]}>{label}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.full,
    overflow: "hidden",
    alignSelf: "flex-start"
  },
  blur: {
    borderRadius: Radius.full,
    overflow: "hidden"
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth
  },
  icon: {
    marginRight: 6,
    fontSize: 14
  },
  label: {
    fontWeight: "600",
    letterSpacing: -0.2
  },
  pressed: {
    opacity: 0.75
  },
  disabled: {
    opacity: 0.45
  }
});

