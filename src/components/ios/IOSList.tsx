import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LightTokens as T, Radius, Shadows } from "@/lib/theme";

type IOSListProps = {
  header?: string;
  footer?: string;
  glass?: boolean;
  children: ReactNode;
};

type IOSListRowProps = {
  label: string;
  detail?: string;
  icon?: string;
  chevron?: boolean;
  onPress?: () => void;
  isLast?: boolean;
  rightElement?: ReactNode;
};

export function IOSList({ header, footer, glass = false, children }: IOSListProps) {
  const useBlur = glass && Platform.OS === "ios";

  return (
    <View style={styles.wrap}>
      {header ? <Text style={styles.header}>{header.toUpperCase()}</Text> : null}
      <View style={[styles.card, Shadows.card]}>
        {useBlur ? (
          <BlurView intensity={65} tint="light" style={styles.blur}>
            {children}
          </BlurView>
        ) : (
          <View style={styles.solid}>{children}</View>
        )}
      </View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

export function IOSListRow({ label, detail, icon, chevron = false, onPress, isLast = false, rightElement }: IOSListRowProps) {
  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={styles.iconBadge}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      ) : null}

      <Text numberOfLines={1} style={styles.label}>
        {label}
      </Text>

      <View style={styles.right}>
        {rightElement ?? (detail ? <Text style={styles.detail}>{detail}</Text> : null)}
        {chevron ? <Text style={styles.chevron}>{">"}</Text> : null}
      </View>

      {!isLast ? <View style={[styles.sep, { left: icon ? 60 : 16 }]} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : null)}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12
  },
  header: {
    marginBottom: 6,
    marginLeft: 4,
    fontSize: 11,
    letterSpacing: 0.5,
    color: T.textSecondary,
    fontWeight: "700"
  },
  footer: {
    marginTop: 6,
    marginLeft: 4,
    fontSize: 12,
    color: T.textSecondary
  },
  card: {
    borderRadius: Radius.xl,
    overflow: "hidden"
  },
  blur: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.glassBorder
  },
  solid: {
    backgroundColor: T.bgSurface
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    position: "relative"
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#e6f4f1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  icon: {
    fontSize: 14
  },
  label: {
    flex: 1,
    color: T.textPrimary,
    fontSize: 16
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  detail: {
    color: T.textSecondary,
    fontSize: 15
  },
  chevron: {
    color: T.textSecondary,
    fontSize: 18
  },
  sep: {
    position: "absolute",
    bottom: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: T.border
  },
  pressed: {
    opacity: 0.7
  }
});
