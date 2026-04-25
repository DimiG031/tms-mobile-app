import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { LightTokens as T, Radius, Shadows } from "@/lib/theme";

type Variant = "default" | "accent" | "warning" | "danger" | "success";
type Size    = "sm" | "md" | "lg";

interface IOSGlassPillProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_COLORS: Record<Variant, { bg: string; border: string; text: string; blurTint: "light" | "dark" | "default" }> = {
  default: {
    bg:       "rgba(255,255,255,0.62)",
    border:   "rgba(255,255,255,0.55)",
    text:     T.textPrimary,
    blurTint: "light",
  },
  accent: {
    bg:       "rgba(13,125,114,0.22)",
    border:   "rgba(13,125,114,0.35)",
    text:     T.accent,
    blurTint: "light",
  },
  warning: {
    bg:       "rgba(245,158,11,0.18)",
    border:   "rgba(245,158,11,0.32)",
    text:     "#92400e",
    blurTint: "light",
  },
  danger: {
    bg:       "rgba(220,38,38,0.14)",
    border:   "rgba(220,38,38,0.28)",
    text:     T.danger,
    blurTint: "light",
  },
  success: {
    bg:       "rgba(22,163,74,0.16)",
    border:   "rgba(22,163,74,0.30)",
    text:     "#15803d",
    blurTint: "light",
  },
};

const SIZE_STYLES: Record<Size, { paddingHorizontal: number; paddingVertical: number; fontSize: number; gap: number }> = {
  sm: { paddingHorizontal: 12, paddingVertical:  6, fontSize: 12, gap: 4 },
  md: { paddingHorizontal: 18, paddingVertical: 11, fontSize: 15, gap: 6 },
  lg: { paddingHorizontal: 24, paddingVertical: 15, fontSize: 17, gap: 8 },
};

export function IOSGlassPill({
  label,
  onPress,
  variant = "default",
  size = "md",
  disabled = false,
  icon,
  style,
}: Readonly<IOSGlassPillProps>): React.JSX.Element {
  const vc    = VARIANT_COLORS[variant];
  const sc    = SIZE_STYLES[size];
  const isBtn = Boolean(onPress);

  const innerContent = (
    <View
      style={[
        styles.inner,
        {
          paddingHorizontal: sc.paddingHorizontal,
          paddingVertical:   sc.paddingVertical,
          gap:               sc.gap,
          borderColor:       vc.border,
        },
      ]}
    >
      {icon ? (
        <Text style={{ fontSize: sc.fontSize + 1 }}>{icon}</Text>
      ) : null}
      <Text style={[styles.label, { fontSize: sc.fontSize, color: vc.text }]}>
        {label}
      </Text>
    </View>
  );

  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    Shadows.pill,
    disabled && styles.disabled,
    style,
  ];

  if (Platform.OS === "ios") {
    if (isBtn) {
      return (
        <Pressable
          onPress={onPress}
          disabled={disabled}
          style={({ pressed }) => [containerStyle, pressed && styles.pressed]}
        >
          <BlurView intensity={60} tint={vc.blurTint} style={[styles.blur, { backgroundColor: vc.bg }]}>
            {innerContent}
          </BlurView>
        </Pressable>
      );
    }
    return (
      <View style={containerStyle}>
        <BlurView intensity={60} tint={vc.blurTint} style={[styles.blur, { backgroundColor: vc.bg }]}>
          {innerContent}
        </BlurView>
      </View>
    );
  }

  // Android fallback
  const androidBg = variant === "default" ? T.bgSurface : vc.bg.replace(/[\d.]+\)$/, "1)");
  if (isBtn) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          containerStyle,
          { backgroundColor: androidBg, borderWidth: 1, borderColor: vc.border },
          pressed && styles.pressed,
        ]}
      >
        {innerContent}
      </Pressable>
    );
  }
  return (
    <View style={[containerStyle, { backgroundColor: androidBg, borderWidth: 1, borderColor: vc.border }]}>
      {innerContent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.full,
    overflow:     "hidden",
    alignSelf:    "flex-start",
  },
  blur: {
    borderRadius: Radius.full,
    overflow:     "hidden",
  },
  inner: {
    flexDirection: "row",
    alignItems:    "center",
    borderRadius:  Radius.full,
    borderWidth:   StyleSheet.hairlineWidth,
  },
  label: {
    fontWeight:    "600",
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
});
