import { Pressable, StyleSheet, Text, View } from "react-native";
import { LightTokens as T, Radius } from "@/lib/theme";

type Props = {
  dark?: boolean;
  onKeyPress?: (key: string) => void;
};

const row1 = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
const row2 = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
const row3 = ["Z", "X", "C", "V", "B", "N", "M"];

export function IOSKeyboardMock({ dark = false, onKeyPress }: Props) {
  const bg = dark ? "#1f2937" : "#d1d5db";
  const key = dark ? "#374151" : "#ffffff";
  const keyAlt = dark ? "#4b5563" : "#adb5bd";
  const fg = dark ? "#ffffff" : "#111827";

  const keyItem = (label: string, alt = false) => (
    <Pressable key={label} onPress={() => onKeyPress?.(label)} style={[styles.key, { backgroundColor: alt ? keyAlt : key }]}>
      <Text style={[styles.keyText, { color: fg }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <View style={styles.row}>{row1.map((k) => keyItem(k))}</View>
      <View style={[styles.row, styles.rowInset]}>{row2.map((k) => keyItem(k))}</View>
      <View style={styles.row}>
        {keyItem("SHIFT", true)}
        {row3.map((k) => keyItem(k))}
        {keyItem("DEL", true)}
      </View>
      <View style={styles.row}>
        {keyItem("123", true)}
        <Pressable onPress={() => onKeyPress?.("SPACE")} style={[styles.key, styles.space, { backgroundColor: key }]}>
          <Text style={[styles.keyText, { color: fg }]}>razmak</Text>
        </Pressable>
        {keyItem("ENTER", true)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.lg,
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 6
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5
  },
  rowInset: {
    paddingHorizontal: 12
  },
  key: {
    height: 40,
    minWidth: 28,
    maxWidth: 44,
    flex: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  keyText: {
    fontSize: 14,
    fontWeight: "600"
  },
  space: {
    maxWidth: 999
  }
});

