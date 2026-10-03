import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { type Range, type RangeInput } from "@/src/api";
import { parsePrice } from "@/src/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Props = {
  visible: boolean;
  initial?: Range | null;
  onClose: () => void;
  onSubmit: (input: RangeInput) => void;
};

export function RangeForm({ visible, initial, onClose, onSubmit }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [minText, setMinText] = useState("");
  const [maxText, setMaxText] = useState("");
  const [noLimit, setNoLimit] = useState(false);
  const [warrantyText, setWarrantyText] = useState("");
  const [sku, setSku] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMinText(initial ? String(initial.min_price) : "");
      setNoLimit(initial ? initial.max_price === null : false);
      setMaxText(initial && initial.max_price !== null ? String(initial.max_price) : "");
      setWarrantyText(initial ? String(initial.warranty_price) : "");
      setSku(initial?.sku ?? "");
      setError(null);
    }
  }, [visible, initial]);

  const submit = () => {
    const min = parsePrice(minText);
    const warranty = parsePrice(warrantyText);
    if (!Number.isFinite(min) || min < 0) return setError("Ingresa un precio mínimo válido");
    if (!Number.isFinite(warranty) || warranty < 0) return setError("Ingresa un precio de garantía válido");
    let max: number | null = null;
    if (!noLimit) {
      max = parsePrice(maxText);
      if (!Number.isFinite(max)) return setError("Ingresa un precio máximo o marca 'sin límite'");
      if ((max as number) <= min) return setError("El máximo debe ser mayor que el mínimo");
    }
    onSubmit({ min_price: min, max_price: max, warranty_price: warranty, sku: sku.trim() || null });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.scrim}>
        <View style={styles.card} testID="range-form">
          <Text style={styles.title}>{initial ? "Editar rango" : "Nuevo rango"}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
            <Text style={styles.label}>Precio mínimo (S/)</Text>
            <TextInput
              testID="range-min"
              value={minText}
              onChangeText={setMinText}
              placeholder="0"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <View style={styles.switchRow}>
              <Text style={styles.label}>Sin límite (último rango)</Text>
              <Switch
                testID="range-nolimit"
                value={noLimit}
                onValueChange={setNoLimit}
                trackColor={{ true: colors.brandSecondary, false: colors.surfaceTertiary }}
                thumbColor={colors.surface}
              />
            </View>

            {!noLimit ? (
              <>
                <Text style={styles.label}>Precio máximo (S/)</Text>
                <TextInput
                  testID="range-max"
                  value={maxText}
                  onChangeText={setMaxText}
                  placeholder="500"
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </>
            ) : null}

            <Text style={styles.label}>Precio de la garantía (S/)</Text>
            <TextInput
              testID="range-warranty"
              value={warrantyText}
              onChangeText={setWarrantyText}
              placeholder="25"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <Text style={styles.label}>SKU del rango (opcional)</Text>
            <TextInput
              testID="range-sku"
              value={sku}
              onChangeText={setSku}
              placeholder="Ej. GAR-CEL-01"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              style={styles.input}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              testID="range-cancel"
              onPress={onClose}
              style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.pressed]}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              testID="range-submit"
              onPress={submit}
              style={({ pressed }) => [styles.btn, styles.btnConfirm, pressed && styles.pressed]}
            >
              <Text style={styles.btnConfirmText}>Guardar</Text>
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
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scroll: { flexGrow: 0 },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "700" },
  label: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "600", marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
    fontSize: 16,
    color: colors.onSurface,
  },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  error: { color: colors.error, fontSize: 13, marginTop: spacing.md },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  btn: { flex: 1, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.8 },
  btnCancel: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  btnCancelText: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  btnConfirm: { backgroundColor: colors.brandPrimary },
  btnConfirmText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
}));
