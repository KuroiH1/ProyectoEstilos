import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Product } from "@/src/api";
import { EmptyState, LoadingState } from "@/src/components/empty-state";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen-header";
import { usesNativeTabs } from "@/src/navigation";
import { formatSoles } from "@/src/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Buscar() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const term = query.trim();

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.listCategories });
  const catMap = useMemo(() => {
    const m: Record<string, string> = {};
    (categories ?? []).forEach((c) => (m[c.id] = c.name));
    return m;
  }, [categories]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["products", "search", term],
    queryFn: () => api.listProducts({ q: term }),
    enabled: term.length > 0,
  });

  const results = term ? data ?? [] : [];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Buscar" />
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color={colors.muted} />
          <TextInput
            testID="search-input"
            value={query}
            onChangeText={setQuery}
            placeholder="Marca o modelo…"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable testID="search-clear" onPress={() => setQuery("")} hitSlop={10}>
              <Icon name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {term.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Busca un equipo"
          message="Escribe una marca o modelo para encontrar tus productos rápidamente."
        />
      ) : isLoading && isFetching ? (
        <LoadingState />
      ) : results.length === 0 ? (
        <EmptyState icon="file-tray-outline" title="Sin resultados" message={`No encontramos "${term}".`} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomChrome + 24, gap: spacing.md }}
          renderItem={({ item }: { item: Product }) => (
            <Pressable
              testID={`search-result-${item.id}`}
              onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowAvatar}>
                <Text style={styles.rowAvatarText}>{item.brand.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.brand} {item.model}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {catMap[item.category_id] ?? "—"}
                  {item.sku ? ` · ${item.sku}` : ""}
                </Text>
              </View>
              <Text style={styles.rowPrice}>{formatSoles(item.price)}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  searchWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.onSurface },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85 },
  rowAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowAvatarText: { color: colors.onBrandTertiary, fontSize: 18, fontWeight: "800" },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  rowMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  rowPrice: { color: colors.brand, fontSize: 15, fontWeight: "700" },
}));
