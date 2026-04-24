import { StyleSheet, Text, View } from "react-native";

type Props = {
  dark?: boolean;
  time?: string;
};

export function IOSStatusBar({ dark = false, time = "9:41" }: Props) {
  const color = dark ? "#fff" : "#000";

  return (
    <View style={styles.wrap}>
      <Text style={[styles.time, { color }]}>{time}</Text>
      <View style={styles.right}>
        <Text style={[styles.meta, { color }]}>5G</Text>
        <Text style={[styles.meta, { color }]}>100%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 10,
    paddingHorizontal: 16,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  time: {
    fontSize: 16,
    fontWeight: "600"
  },
  right: {
    flexDirection: "row",
    gap: 8
  },
  meta: {
    fontSize: 12,
    fontWeight: "600"
  }
});

