import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Product } from "@/src/api";
import { EmptyState, ErrorState, LoadingState } from "@/src/components/empty-state";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen-header";
import { formatSoles, normalizeBrand } from "@/src/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function ProductsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId: string; categoryName: string; brand: string }>();
  const { categoryId, categoryName, brand } = params;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["products", categoryId],
    queryFn: () => api.listProducts({ categoryId }),
    enabled: !!categoryId,
  });

  const products = useMemo(() => {
    const target = normalizeBrand(brand ?? "");
    return (data ?? []).filter((p: Product) => normalizeBrand(p.brand) === target);
  }, [data, brand]);

  const goRegister = () =>
    router.push({ pathname: "/product-form", params: { categoryId, categoryName, brand } });

  const renderBody = () => {
    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState onRetry={refetch} />;
    if (products.length === 0) {
      return (
        <EmptyState
          icon="cube-outline"
          title="No hay productos de esta marca"
          message="Registra un equipo para esta marca."
          actionLabel="Registrar equipo"
          onAction={goRegister}
        />
      );
    }
    return (
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24, gap: spacing.md }}
        renderItem={({ item }: { item: Product }) => (
          <Pressable
            testID={`product-row-${item.id}`}
            onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.model}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.sku ? `SKU: ${item.sku}` : "Sin SKU"}
                {item.colors.length > 0 ? ` · ${item.colors.length} color(es)` : ""}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowPrice}>{formatSoles(item.price)}</Text>
              <Icon name="chevron-forward" size={18} color={colors.muted} />
            </View>
          </Pressable>
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={brand ?? "Marca"}
        subtitle={categoryName}
        onBack={() => router.back()}
        right={
          <Pressable testID="register-in-brand" onPress={goRegister} hitSlop={10} style={styles.headerAdd}>
            <Icon name="add" size={24} color={colors.brand} />
          </Pressable>
        }
      />
      {renderBody()}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  headerAdd: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  row: {
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
  pressed: { opacity: 0.85 },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  rowMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  rowRight: { alignItems: "flex-end", flexDirection: "row", gap: spacing.xs },
  rowPrice: { color: colors.brand, fontSize: 15, fontWeight: "700" },
}));
