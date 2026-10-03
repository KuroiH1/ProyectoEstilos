import { Platform } from "react-native";

// iOS 26+ renders production-ready native tabs ("unstable" is only the import
// path). Older iOS, Android and web fall back to the classic JS tab bar.
export const usesNativeTabs =
  Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;
