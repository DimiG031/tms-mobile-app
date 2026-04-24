import { ScrollView, StyleSheet, View } from "react-native";
import { IOSStatusBar } from "./IOSStatusBar";

type Props = {
  children: React.ReactNode;
  dark?: boolean;
  time?: string;
  width?: number;
  height?: number;
  scrollable?: boolean;
};

export function IOSDeviceFrame({ children, dark = false, time = "9:41", width = 390, height = 844, scrollable = false }: Props) {
  return (
    <View style={[styles.frame, { width, height }]}>
      <View style={styles.island} />
      <View style={styles.statusLayer} pointerEvents="none">
        <IOSStatusBar dark={dark} time={time} />
      </View>

      <View style={styles.content}>
        {scrollable ? (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={styles.fill}>{children}</View>
        )}
      </View>

      <View style={styles.homeWrap} pointerEvents="none">
        <View style={[styles.home, { backgroundColor: dark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.2)" }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 50,
    overflow: "hidden",
    backgroundColor: "#f2f2f7",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.14)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.22,
    shadowRadius: 48,
    elevation: 16
  },
  island: {
    position: "absolute",
    zIndex: 30,
    top: 11,
    alignSelf: "center",
    width: 126,
    height: 37,
    borderRadius: 24,
    backgroundColor: "#000"
  },
  statusLayer: {
    position: "absolute",
    zIndex: 20,
    top: 0,
    left: 0,
    right: 0
  },
  content: {
    flex: 1
  },
  scroll: {
    flexGrow: 1
  },
  fill: {
    flex: 1
  },
  homeWrap: {
    position: "absolute",
    zIndex: 30,
    left: 0,
    right: 0,
    bottom: 0,
    height: 34,
    paddingBottom: 8,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  home: {
    width: 139,
    height: 5,
    borderRadius: 99
  }
});

