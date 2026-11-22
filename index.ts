// Keep Metro runtime first, including on web. Register headless tasks before Router.
import "@expo/metro-runtime";
import "./src/background/gpsTask";
import "expo-router/entry";
