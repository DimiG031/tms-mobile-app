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
import { LightTokens as T, Radius, Shadows, Typography } from "@/lib/theme";

// ─── IOSList ──────────────────────────────────────────────────

interface IOSListProps {
  header?: string;
  footer?: string;
  glass?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function IOSList({
  header,
  footer,
  glass = false,
  children,
  style,
}: Readonly<IOSListProps>): React.JSX.Element {
  const useBlur = glass && Platform.OS === "ios";

  const inner = <View style={styles.listInner}>{children}</View>;

  return (
    <View style={[styles.listOuter, style]}>
      {header ? (
        <Text style={styles.header}>{header.toUpperCase()}</Text>
      ) : null}

      <View style={[styles.listContainer, Shadows.card]}>
        {useBlur ? (
          <BlurView intensity={70} tint="light" style={styles.blur}>
            {inner}
          </BlurView>
        ) : (
          <View style={styles.solidBg}>{inner}</View>
        )}
      </View>

      {footer ? (
        <Text style={styles.footer}>{footer}</Text>
      ) : null}
    </View>
  );
}

// ─── IOSListRow ───────────────────────────────────────────────

interface IOSListRowProps {
  label: string;
  detail?: string;
  chevron?: boolean;
  onPress?: () => void;
  icon?: string;
  iconColor?: string;
  rightElement?: React.ReactNode;
  destructive?: boolean;
  isLast?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IOSListRow({
  label,
  detail,
  chevron = false,
  onPress,
  icon,
  iconColor,
  rightElement,
  destructive = false,
  isLast = false,
  style,
}: Readonly<IOSListRowProps>): React.JSX.Element {
  const labelColor   = destructive ? T.danger : T.textPrimary;
  const isInteractive = Boolean(onPress);

  const content = (
    <View style={[styles.rowInner, style]}>
      {icon ? (
        <View style={[styles.iconBadge, { backgroundColor: iconColor ?? T.accentLight }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
      ) : null}

      <Text style={[styles.rowLabel, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>

      <View style={styles.rightSide}>
        {rightElement ?? (
          <>
            {detail ? (
              <Text style={styles.detail} numberOfLines={1}>{detail}</Text>
            ) : null}
            {chevron ? (
              <Text style={styles.chevron}>{"›"}</Text>
            ) : null}
          </>
        )}
      </View>

      {isLast ? null : (
        <View style={[styles.separator, { left: icon ? 58 : 16 }]} />
      )}
    </View>
  );

  if (isInteractive) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  listOuter: {
    marginHorizontal: 16,
    marginBottom:     8,
  },
  header: {
    ...Typography.caption2,
    color:         T.textSecondary,
    letterSpacing: 0.5,
    marginBottom:  6,
    marginLeft:    4,
    fontWeight:    "600",
  },
  footer: {
    ...Typography.caption2,
    color:      T.textSecondary,
    marginTop:  6,
    marginLeft: 4,
    lineHeight: 16,
  },
  listContainer: {
    borderRadius: Radius.lg,
    overflow:     "hidden",
  },
  blur: {
    borderRadius: Radius.lg,
    overflow:     "hidden",
    borderWidth:  StyleSheet.hairlineWidth,
    borderColor:  "rgba(255,255,255,0.55)",
  },
  solidBg: {
    backgroundColor: T.bgSurface,
  },
  listInner: {},

  rowInner: {
    flexDirection:     "row",
    alignItems:        "center",
    minHeight:         48,
    paddingHorizontal: 16,
    paddingVertical:   12,
    position:          "relative",
  },
  iconBadge: {
    width:          32,
    height:         32,
    borderRadius:   8,
    alignItems:     "center",
    justifyContent: "center",
    marginRight:    12,
  },
  iconText: {
    fontSize:   17,
    lineHeight: 20,
  },
  rowLabel: {
    flex:       1,
    ...Typography.subhead,
    fontWeight: "400",
  },
  rightSide: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            4,
    marginLeft:     8,
    flexShrink:     0,
  },
  detail: {
    ...Typography.subhead,
    color:      T.textSecondary,
    fontWeight: "400",
    maxWidth:   140,
  },
  chevron: {
    fontSize:    20,
    color:       T.textTertiary,
    lineHeight:  22,
    marginRight: -4,
  },
  separator: {
    position:        "absolute",
    bottom:          0,
    right:           0,
    height:          StyleSheet.hairlineWidth,
    backgroundColor: T.border,
  },
  pressed: {
    backgroundColor: "rgba(0,0,0,0.05)",
  },
});
