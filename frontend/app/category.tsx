import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Product } from "@/src/api";
import { EmptyState, ErrorState, LoadingState } from "@/src/components/empty-state";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen-header";
import { normalizeBrand } from "@/src/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type BrandGroup = { key: string; display: string; count: number };

export default function CategoryScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name: string }>();
  const categoryId = params.id;
  const categoryName = params.name ?? "Categoría";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["products", categoryId],
    queryFn: () => api.listProducts({ categoryId }),
    enabled: !!categoryId,
  });

  const brands: BrandGroup[] = useMemo(() => {
    const map = new Map<string, BrandGroup>();
    (data ?? []).forEach((p: Product) => {
      const key = normalizeBrand(p.brand);
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { key, display: p.brand, count: 1 });
    });
    return Array.from(map.values()).sort((a, b) => a.display.localeCompare(b.display, "es"));
  }, [data]);

  const goRegister = () =>
    router.push({ pathname: "/product-form", params: { categoryId, categoryName } });

  const renderBody = () => {
    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState onRetry={refetch} />;
    if (brands.length === 0) {
      return (
        <EmptyState
          icon="albums-outline"
          title="Aún no hay marcas en esta categoría"
          message="Registra un equipo y su marca aparecerá aquí automáticamente."
          actionLabel="Registrar equipo"
          onAction={goRegister}
        />
      );
    }
    return (
      <FlatList
        data={brands}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24, gap: spacing.md }}
        renderItem={({ item }) => (
          <Pressable
            testID={`brand-row-${item.key}`}
            onPress={() =>
              router.push({
                pathname: "/products",
                params: { categoryId, categoryName, brand: item.display },
              })
            }
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.display.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.display}
              </Text>
              <Text style={styles.rowMeta}>
                {item.count} {item.count === 1 ? "equipo" : "equipos"}
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={categoryName}
        subtitle="Marcas"
        onBack={() => router.back()}
        right={
          <Pressable testID="register-in-category" onPress={goRegister} hitSlop={10} style={styles.headerAdd}>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.onBrandTertiary, fontSize: 18, fontWeight: "800" },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  rowMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
}));
