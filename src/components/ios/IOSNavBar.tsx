import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LightTokens as T, Radius } from "@/lib/theme";

type Props = {
  title: string;
  dark?: boolean;
  onBack?: () => void;
  rightElement?: ReactNode;
};

export function IOSNavBar({ title, dark = false, onBack, rightElement }: Props) {
  const fg = dark ? "#ffffff" : T.textPrimary;
  const subtle = dark ? "rgba(255,255,255,0.9)" : T.textSecondary;

  const content = (
    <View style={styles.inner}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={({ pressed }) => [styles.backBtn, pressed ? styles.pressed : null]}>
            <Text style={[styles.chevron, { color: subtle }]}>{"<"}</Text>
          </Pressable>
        ) : null}
      </View>

      <Text numberOfLines={1} style={[styles.title, { color: fg }]}>
        {title}
      </Text>

      <View style={[styles.side, styles.sideRight]}>{rightElement ?? null}</View>
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={70} tint={dark ? "dark" : "light"} style={styles.wrap}>
        {content}
      </BlurView>
    );
  }

  return <View style={[styles.wrap, { backgroundColor: dark ? T.accentDark : T.bgSurface }]}>{content}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.12)"
  },
  inner: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  side: {
    minWidth: 56,
    flexDirection: "row",
    alignItems: "center"
  },
  sideRight: {
    justifyContent: "flex-end"
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center"
  },
  chevron: {
    fontSize: 22,
    marginTop: -1
  },
  title: {
    flexShrink: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.6
  }
});
