import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type ProductColor, type ProductInput } from "@/src/api";
import { useConfirm } from "@/src/components/confirm-dialog";
import { Icon } from "@/src/components/icon";
import { LoadingState } from "@/src/components/empty-state";
import { ScreenHeader } from "@/src/components/screen-header";
import { useToast } from "@/src/components/toast";
import { findRange, formatSoles, parsePrice } from "@/src/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type ColorRow = { name: string; sku: string };

export default function ProductForm() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    id?: string;
    categoryId?: string;
    categoryName?: string;
    brand?: string;
  }>();
  const isEdit = !!params.id;

  const [brand, setBrand] = useState(params.brand ?? "");
  const [model, setModel] = useState("");
  const [priceText, setPriceText] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState(params.categoryId ?? "");
  const [colorRows, setColorRows] = useState<ColorRow[]>([]);
  const [notes, setNotes] = useState("");
  const [initialized, setInitialized] = useState(!isEdit);

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.listCategories });

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", params.id],
    queryFn: () => api.getProduct(params.id as string),
    enabled: isEdit,
  });

  useEffect(() => {
    if (product && !initialized) {
      setBrand(product.brand);
      setModel(product.model);
      setPriceText(String(product.price));
      setSku(product.sku ?? "");
      setCategoryId(product.category_id);
      setColorRows(product.colors.map((c) => ({ name: c.name, sku: c.sku ?? "" })));
      setNotes(product.notes ?? "");
      setInitialized(true);
    }
  }, [product, initialized]);

  const { data: ranges } = useQuery({
    queryKey: ["ranges", categoryId],
    queryFn: () => api.listRanges(categoryId),
    enabled: !!categoryId,
  });

  const price = parsePrice(priceText);
  const matchedRange = useMemo(() => {
    if (!Number.isFinite(price) || !ranges) return null;
    return findRange(price, ranges);
  }, [price, ranges]);

  const warranty = matchedRange?.warranty_price ?? null;
  const total = Number.isFinite(price) && warranty !== null ? price + warranty : null;

  const saveMutation = useMutation({
    mutationFn: (input: ProductInput) =>
      isEdit ? api.updateProduct(params.id as string, input) : api.createProduct(input),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", saved.category_id] });
      queryClient.invalidateQueries({ queryKey: ["product", saved.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast(isEdit ? "Producto actualizado" : "Producto registrado", "success");
      router.replace({ pathname: "/product/[id]", params: { id: saved.id } });
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const handleSave = () => {
    if (!brand.trim()) return toast("La marca es obligatoria", "error");
    if (!model.trim()) return toast("El modelo es obligatorio", "error");
    if (!Number.isFinite(price) || price < 0) return toast("Ingresa un precio válido", "error");
    if (!categoryId) return toast("Selecciona una categoría", "error");
    const cleanColors: ProductColor[] = colorRows
      .filter((c) => c.name.trim())
      .map((c) => ({ name: c.name.trim(), sku: c.sku.trim() || null }));
    const input: ProductInput = {
      category_id: categoryId,
      brand: brand.trim(),
      model: model.trim(),
      price,
      sku: sku.trim() || null,
      colors: cleanColors,
      notes: notes.trim() || null,
    };
    saveMutation.mutate(input);
  };

  const removeColor = async (index: number) => {
    const row = colorRows[index];
    if (row.name.trim()) {
      const ok = await confirm({
        title: "¿Quitar este color?",
        message: `Se eliminará "${row.name}" del producto.`,
        destructive: true,
      });
      if (!ok) return;
    }
    setColorRows((prev) => prev.filter((_, i) => i !== index));
  };

  if (isEdit && loadingProduct) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Editar producto" onBack={() => router.back()} />
        <LoadingState />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={isEdit ? "Editar producto" : "Registrar producto"}
        onBack={() => router.back()}
      />
      <KeyboardAwareScrollView
        bottomOffset={140}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 220, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Field label="Marca *">
          <TextInput
            testID="input-brand"
            value={brand}
            onChangeText={setBrand}
            placeholder="Ej. Samsung"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </Field>

        <Field label="Modelo *">
          <TextInput
            testID="input-model"
            value={model}
            onChangeText={setModel}
            placeholder="Ej. Galaxy A54"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </Field>

        <Field label="Precio (S/) *">
          <TextInput
            testID="input-price"
            value={priceText}
            onChangeText={setPriceText}
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </Field>

        <Field label="SKU / Código (opcional)">
          <TextInput
            testID="input-sku"
            value={sku}
            onChangeText={setSku}
            placeholder="Ej. SMG-A54-001"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            style={styles.input}
          />
        </Field>

        <Field label="Categoría *">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {(categories ?? []).map((c) => {
              const active = c.id === categoryId;
              return (
                <Pressable
                  key={c.id}
                  testID={`category-chip-${c.id}`}
                  onPress={() => setCategoryId(c.id)}
                  style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                >
                  <Text style={active ? styles.chipTextActive : styles.chipText}>{c.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>

        <View style={styles.colorsSection}>
          <View style={styles.colorsHeader}>
            <Text style={styles.label}>Colores del modelo</Text>
            <Pressable
              testID="add-color-button"
              onPress={() => setColorRows((prev) => [...prev, { name: "", sku: "" }])}
              style={({ pressed }) => [styles.addColorBtn, pressed && styles.pressed]}
            >
              <Icon name="add" size={18} color={colors.brand} />
              <Text style={styles.addColorText}>Agregar color</Text>
            </Pressable>
          </View>
          {colorRows.length === 0 ? (
            <Text style={styles.hint}>Opcional. Cada color puede tener su propio SKU.</Text>
          ) : null}
          {colorRows.map((row, i) => (
            <View key={i} style={styles.colorRow} testID={`color-row-${i}`}>
              <View style={styles.colorInputs}>
                <TextInput
                  testID={`color-name-${i}`}
                  value={row.name}
                  onChangeText={(t) =>
                    setColorRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, name: t } : r)))
                  }
                  placeholder="Nombre (ej. Negro)"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.inputSmall]}
                />
                <TextInput
                  testID={`color-sku-${i}`}
                  value={row.sku}
                  onChangeText={(t) =>
                    setColorRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, sku: t } : r)))
                  }
                  placeholder="SKU del color (opcional)"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  style={[styles.input, styles.inputSmall]}
                />
              </View>
              <Pressable
                testID={`remove-color-${i}`}
                onPress={() => removeColor(i)}
                hitSlop={8}
                style={({ pressed }) => [styles.removeColor, pressed && styles.pressed]}
              >
                <Icon name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            </View>
          ))}
        </View>

        <Field label="Notas (opcional)">
          <TextInput
            testID="input-notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="N° de serie, tienda, etc."
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.input, styles.textArea]}
          />
        </Field>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View style={[styles.sticky, { paddingBottom: insets.bottom + spacing.sm }]}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Garantía</Text>
              <Text style={styles.summaryValue} testID="warranty-live">
                {warranty !== null ? formatSoles(warranty) : "—"}
              </Text>
            </View>
            <View style={styles.summaryRight}>
              <Text style={styles.summaryLabel}>Total (producto + garantía)</Text>
              <Text style={styles.summaryTotal} testID="total-live">
                {total !== null ? formatSoles(total) : "—"}
              </Text>
            </View>
          </View>
          <Pressable
            testID="save-product-button"
            onPress={handleSave}
            disabled={saveMutation.isPending}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, saveMutation.isPending && styles.disabled]}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <Text style={styles.saveText}>Guardar</Text>
            )}
          </Pressable>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  field: { gap: spacing.sm },
  label: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 13 },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
    fontSize: 16,
    color: colors.onSurface,
  },
  inputSmall: { height: 48, fontSize: 15 },
  textArea: { height: 90, paddingTop: spacing.md, textAlignVertical: "top" },
  chipsRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    flexShrink: 0,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipInactive: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "600" },
  chipTextActive: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "600" },
  colorsSection: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addColorBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  addColorText: { color: colors.brand, fontSize: 14, fontWeight: "700" },
  colorRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  colorInputs: { flex: 1, gap: spacing.sm },
  removeColor: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.8 },
  sticky: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  summaryRight: { alignItems: "flex-end" },
  summaryLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  summaryValue: { color: colors.onSurface, fontSize: 18, fontWeight: "700", marginTop: 2 },
  summaryTotal: { color: colors.brand, fontSize: 20, fontWeight: "800", marginTop: 2 },
  saveBtn: {
    backgroundColor: colors.brandPrimary,
    height: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.6 },
  saveText: { color: colors.onBrandPrimary, fontSize: 17, fontWeight: "700" },
}));
