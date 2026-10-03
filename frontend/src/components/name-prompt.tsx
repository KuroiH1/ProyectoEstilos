import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Props = {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
};

export function NamePrompt({
  visible,
  title,
  placeholder,
  initialValue = "",
  submitLabel = "Guardar",
  onClose,
  onSubmit,
}: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.scrim}
      >
        <View style={styles.card} testID="name-prompt">
          <Text style={styles.title}>{title}</Text>
          <TextInput
            testID="name-prompt-input"
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View style={styles.actions}>
            <Pressable
              testID="name-prompt-cancel"
              onPress={onClose}
              style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.pressed]}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              testID="name-prompt-submit"
              onPress={submit}
              style={({ pressed }) => [styles.btn, styles.btnConfirm, pressed && styles.pressed]}
            >
              <Text style={styles.btnConfirmText}>{submitLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "700" },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
    fontSize: 16,
    color: colors.onSurface,
  },
  actions: { flexDirection: "row", gap: spacing.md },
  btn: { flex: 1, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.8 },
  btnCancel: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  btnCancelText: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  btnConfirm: { backgroundColor: colors.brandPrimary },
  btnConfirmText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
}));
