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

interface IOSNavBarProps {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  rightElement?: React.ReactNode;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IOSNavBar({
  title,
  onBack,
  backLabel = "Nazad",
  rightElement,
  dark = false,
  style,
}: Readonly<IOSNavBarProps>): React.JSX.Element {
  const textColor   = dark ? T.textInverse : T.textPrimary;
  const accentColor = dark ? "rgba(255,255,255,0.9)" : T.accent;

  const content = (
    <View style={[styles.inner, style]}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={[styles.chevron, { color: accentColor }]}>{"‹"}</Text>
            <Text style={[styles.backLabel, { color: accentColor }]}>{backLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      {title ? (
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View />
      )}

      <View style={[styles.side, styles.sideRight]}>
        {rightElement ?? null}
      </View>
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <BlurView
        intensity={80}
        tint={dark ? "dark" : "light"}
        style={[styles.container, Shadows.glass]}
      >
        {content}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: dark ? T.accentDark : T.bgSurface },
        Shadows.card,
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.12)",
    overflow:          "hidden",
  },
  inner: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    height:            56,
    paddingHorizontal: 8,
  },
  side: {
    minWidth:      80,
    flexDirection: "row",
    alignItems:    "center",
  },
  sideRight: {
    justifyContent: "flex-end",
  },
  backBtn: {
    flexDirection: "row",
    alignItems:    "center",
    padding:       8,
    borderRadius:  Radius.sm,
    gap:           2,
  },
  pressed: {
    opacity: 0.55,
  },
  chevron: {
    fontSize:   26,
    fontWeight: "300",
    lineHeight: 30,
    marginTop:  -2,
  },
  backLabel: {
    fontSize:   17,
    fontWeight: "400",
  },
  title: {
    fontSize:      17,
    fontWeight:    "600",
    letterSpacing: -0.2,
    flexShrink:    1,
    textAlign:     "center",
  },
});
