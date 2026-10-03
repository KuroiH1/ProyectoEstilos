// Centered confirmation dialog with "Sí" / "No" buttons, exposed via a
// promise-based hook. Mounted once at the app root.
import * as Haptics from "expo-haptics";
import { createContext, useCallback, useContext, useRef, useState, type PropsWithChildren } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { makeStyles, radius, spacing } from "@/src/theme";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: PropsWithChildren) {
  const styles = useStyles();
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    setVisible(false);
    resolver.current?.(result);
    resolver.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close(false)}>
        <View style={styles.scrim}>
          <View style={styles.card} testID="confirm-dialog">
            <Text style={styles.title} testID="confirm-dialog-title">
              {options?.title}
            </Text>
            {options?.message ? <Text style={styles.message}>{options.message}</Text> : null}
            <View style={styles.actions}>
              <Pressable
                testID="confirm-dialog-no"
                onPress={() => close(false)}
                style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.pressed]}
              >
                <Text style={styles.btnCancelText}>{options?.cancelText ?? "No"}</Text>
              </Pressable>
              <Pressable
                testID="confirm-dialog-yes"
                onPress={() => close(true)}
                style={({ pressed }) => [
                  styles.btn,
                  options?.destructive ? styles.btnDanger : styles.btnConfirm,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={
                    options?.destructive ? styles.btnDangerText : styles.btnConfirmText
                  }
                >
                  {options?.confirmText ?? "Sí"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

const useStyles = makeStyles((colors) => ({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.8 },
  btnCancel: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnCancelText: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  btnConfirm: { backgroundColor: colors.brandPrimary },
  btnConfirmText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
  btnDanger: { backgroundColor: colors.error },
  btnDangerText: { color: colors.onError, fontSize: 16, fontWeight: "700" },
}));
