import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useConfirm } from "@/src/components/confirm-dialog";
import { ErrorState, LoadingState } from "@/src/components/empty-state";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen-header";
import { useToast } from "@/src/components/toast";
import { findRange, formatSoles } from "@/src/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function ProductDetail() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const productId = params.id;

  const [selected, setSelected] = useState<number | null>(null);

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.getProduct(productId),
    enabled: !!productId,
  });

  const { data: ranges } = useQuery({
    queryKey: ["ranges", product?.category_id],
    queryFn: () => api.listRanges(product!.category_id),
    enabled: !!product?.category_id,
  });

  const matchedRange = useMemo(() => {
    if (!product || !ranges) return null;
    return findRange(product.price, ranges);
  }, [product, ranges]);

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (product) queryClient.invalidateQueries({ queryKey: ["products", product.category_id] });
      toast("Producto eliminado", "success");
      router.back();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const handleDelete = async () => {
    const ok = await confirm({
      title: "¿Eliminar producto?",
      message: `Se eliminará "${product?.brand} ${product?.model}".`,
      destructive: true,
    });
    if (ok) deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Producto" onBack={() => router.back()} />
        <LoadingState />
      </View>
    );
  }
  if (isError || !product) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Producto" onBack={() => router.back()} />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  const colorsList = product.colors ?? [];
  const multiColor = colorsList.length > 1;
  const needChoose = multiColor && selected === null;
  const activeColor =
    selected !== null ? colorsList[selected] : colorsList.length === 1 ? colorsList[0] : null;

  const warranty = matchedRange?.warranty_price ?? null;
  const total = warranty !== null ? product.price + warranty : null;

  // ---- Color chooser screen ----
  if (needChoose) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Elige el color" subtitle={`${product.brand} ${product.model}`} onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24, gap: spacing.md }}>
          {colorsList.map((c, i) => (
            <Pressable
              key={i}
              testID={`choose-color-${i}`}
              onPress={() => setSelected(i)}
              style={({ pressed }) => [styles.colorChoice, pressed && styles.pressed]}
            >
              <View style={styles.colorDot}>
                <Icon name="color-palette" size={22} color={colors.brand} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{c.name}</Text>
                <Text style={styles.rowMeta}>{c.sku ? `SKU: ${c.sku}` : "Sin SKU"}</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ---- Result screen ----
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={product.model}
        subtitle={product.brand}
        onBack={() => router.back()}
        right={
          <Pressable
            testID="delete-product-button"
            onPress={handleDelete}
            hitSlop={10}
            style={styles.headerIcon}
          >
            <Icon name="trash-outline" size={22} color={colors.error} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24, gap: spacing.lg }}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon name="cube" size={34} color={colors.onBrandPrimary} />
          </View>
          <Text style={styles.heroTitle}>
            {product.brand} {product.model}
          </Text>
          {activeColor ? (
            <View style={styles.colorBadge}>
              <Icon name="color-palette" size={14} color={colors.onBrandTertiary} />
              <Text style={styles.colorBadgeText}>{activeColor.name}</Text>
            </View>
          ) : null}
        </View>

        {/* Precios */}
        <View style={styles.card}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Precio del producto</Text>
            <Text style={styles.priceValue}>{formatSoles(product.price)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Precio de garantía</Text>
            <Text style={styles.priceValue} testID="detail-warranty">
              {warranty !== null ? formatSoles(warranty) : "—"}
            </Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>SUMA (producto + garantía)</Text>
            <Text style={styles.totalValue} testID="detail-total">
              {total !== null ? formatSoles(total) : "—"}
            </Text>
          </View>
        </View>

        {/* Códigos */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Códigos</Text>
          <CodeRow label="SKU del producto" value={product.sku} colors={colors} />
          {activeColor ? (
            <CodeRow label={`SKU del color (${activeColor.name})`} value={activeColor.sku ?? null} colors={colors} />
          ) : null}
          <CodeRow label="SKU del rango de garantía" value={matchedRange?.sku ?? null} colors={colors} />
        </View>

        {product.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Notas</Text>
            <Text style={styles.notes}>{product.notes}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {multiColor ? (
            <Pressable
              testID="change-color-button"
              onPress={() => setSelected(null)}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Icon name="color-palette-outline" size={20} color={colors.brand} />
              <Text style={styles.secondaryText}>Cambiar color</Text>
            </Pressable>
          ) : null}
          <Pressable
            testID="edit-product-button"
            onPress={() => router.push({ pathname: "/product-form", params: { id: product.id } })}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Icon name="create-outline" size={20} color={colors.onBrandPrimary} />
            <Text style={styles.primaryText}>Editar producto</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function CodeRow({
  label,
  value,
  colors,
}: {
  label: string;
  value?: string | null;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const styles = useStyles();
  return (
    <View style={styles.codeRow}>
      <Text style={styles.codeLabel}>{label}</Text>
      <Text style={[styles.codeValue, !value && { color: colors.muted }]}>{value || "—"}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  headerIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.85 },
  hero: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "800", textAlign: "center" },
  colorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  colorBadgeText: { color: colors.onBrandTertiary, fontSize: 13, fontWeight: "700" },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { color: colors.onSurfaceSecondary, fontSize: 15 },
  priceValue: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  totalDivider: { height: 1, backgroundColor: colors.border },
  totalLabel: { color: colors.onSurface, fontSize: 15, fontWeight: "700", flex: 1 },
  totalValue: { color: colors.brand, fontSize: 22, fontWeight: "800" },
  codeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  codeLabel: { color: colors.onSurfaceSecondary, fontSize: 14, flex: 1 },
  codeValue: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  notes: { color: colors.onSurfaceSecondary, fontSize: 15, lineHeight: 22 },
  colorChoice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorDot: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  rowMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  actions: { gap: spacing.md },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandPrimary,
    height: 54,
    borderRadius: radius.md,
  },
  primaryText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.brand, fontSize: 16, fontWeight: "700" },
}));
