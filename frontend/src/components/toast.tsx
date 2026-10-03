// Lightweight top toast, exposed via useToast(). Mounted once at the app root.
import { useCallback, useContext, useRef, useState, createContext, type PropsWithChildren } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type ToastType = "success" | "error" | "info";
type ToastFn = (message: string, type?: ToastType) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: PropsWithChildren) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<ToastFn>(
    (message, type = "info") => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, type });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
          () => setToast(null),
        );
      }, 2600);
    },
    [opacity],
  );

  const bg =
    toast?.type === "success"
      ? colors.success
      : toast?.type === "error"
        ? colors.error
        : colors.surfaceInverse;
  const fg =
    toast?.type === "success"
      ? colors.onSuccess
      : toast?.type === "error"
        ? colors.onError
        : colors.onSurfaceInverse;
  const iconName =
    toast?.type === "success"
      ? "checkmark-circle"
      : toast?.type === "error"
        ? "alert-circle"
        : "information-circle";

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.wrap, { top: insets.top + spacing.sm, opacity }]}
          testID="toast"
        >
          <View style={[styles.toast, { backgroundColor: bg }]}>
            <Icon name={iconName} size={20} color={fg} />
            <Text style={[styles.text, { color: fg }]} numberOfLines={3}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const useStyles = makeStyles(() => ({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
    zIndex: 1000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    maxWidth: 480,
  },
  text: { flex: 1, fontSize: 14, fontWeight: "600" },
}));
