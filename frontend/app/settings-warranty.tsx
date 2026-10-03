import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Range, type RangeInput } from "@/src/api";
import { useConfirm } from "@/src/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/src/components/empty-state";
import { Icon } from "@/src/components/icon";
import { RangeForm } from "@/src/components/range-form";
import { ScreenHeader } from "@/src/components/screen-header";
import { useToast } from "@/src/components/toast";
import { formatSoles, rangeLabel } from "@/src/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function SettingsWarranty() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ categoryId?: string }>();

  const [selectedCat, setSelectedCat] = useState<string | null>(params.categoryId ?? null);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Range | null>(null);

  const { data: categories, isLoading: loadingCats } = useQuery({
    queryKey: ["categories"],
    queryFn: api.listCategories,
  });

  useEffect(() => {
    if (!selectedCat && categories && categories.length > 0) {
      setSelectedCat(categories[0].id);
    }
  }, [categories, selectedCat]);

  const {
    data: ranges,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["ranges", selectedCat],
    queryFn: () => api.listRanges(selectedCat as string),
    enabled: !!selectedCat,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ranges", selectedCat] });

  const createMutation = useMutation({
    mutationFn: (input: RangeInput) => api.createRange(selectedCat as string, input),
    onSuccess: () => {
      invalidate();
      toast("Rango creado", "success");
      setFormVisible(false);
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: RangeInput }) => api.updateRange(id, input),
    onSuccess: () => {
      invalidate();
      toast("Rango actualizado", "success");
      setEditing(null);
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRange(id),
    onSuccess: () => {
      invalidate();
      toast("Rango eliminado", "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const handleDelete = async (r: Range) => {
    const ok = await confirm({
      title: "¿Eliminar rango?",
      message: `Se eliminará el rango ${rangeLabel(r)}.`,
      destructive: true,
    });
    if (ok) deleteMutation.mutate(r.id);
  };

  const hasCategories = (categories ?? []).length > 0;

  const renderRanges = () => {
    if (!selectedCat) return null;
    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState onRetry={refetch} />;
    const list = ranges ?? [];
    if (list.length === 0) {
      return (
        <EmptyState
          icon="shield-outline"
          title="Sin rangos de garantía"
          message="Agrega rangos por precio para calcular la garantía automáticamente."
          actionLabel="Añadir rango"
          onAction={() => {
            setEditing(null);
            setFormVisible(true);
          }}
        />
      );
    }
    return (
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24, gap: spacing.md }}
        renderItem={({ item }: { item: Range }) => (
          <View style={styles.rangeRow} testID={`range-row-${item.id}`}>
            <View style={styles.rangeBody}>
              <Text style={styles.rangeLabel}>{rangeLabel(item)}</Text>
              <Text style={styles.rangeMeta}>
                Garantía: {formatSoles(item.warranty_price)}
                {item.sku ? ` · ${item.sku}` : ""}
              </Text>
            </View>
            <Pressable
              testID={`edit-range-${item.id}`}
              onPress={() => {
                setEditing(item);
                setFormVisible(true);
              }}
              hitSlop={8}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            >
              <Icon name="create-outline" size={20} color={colors.onSurfaceSecondary} />
            </Pressable>
            <Pressable
              testID={`delete-range-${item.id}`}
              onPress={() => handleDelete(item)}
              hitSlop={8}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            >
              <Icon name="trash-outline" size={20} color={colors.error} />
            </Pressable>
          </View>
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Reglas de garantía"
        onBack={() => router.back()}
        right={
          hasCategories && selectedCat ? (
            <Pressable
              testID="add-range-header"
              onPress={() => {
                setEditing(null);
                setFormVisible(true);
              }}
              hitSlop={10}
              style={styles.iconBtn}
            >
              <Icon name="add" size={24} color={colors.brand} />
            </Pressable>
          ) : undefined
        }
      />

      {loadingCats ? (
        <LoadingState />
      ) : !hasCategories ? (
        <EmptyState
          icon="pricetags-outline"
          title="No hay categorías"
          message="Primero crea una categoría para definir sus reglas de garantía."
          actionLabel="Ir a Categorías"
          onAction={() => router.push("/settings-categories")}
        />
      ) : (
        <>
          <View style={styles.chipsWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {(categories ?? []).map((c) => {
                const active = c.id === selectedCat;
                return (
                  <Pressable
                    key={c.id}
                    testID={`warranty-cat-chip-${c.id}`}
                    onPress={() => setSelectedCat(c.id)}
                    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                  >
                    <Text style={active ? styles.chipTextActive : styles.chipText}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          {renderRanges()}
        </>
      )}

      <RangeForm
        visible={formVisible}
        initial={editing}
        onClose={() => {
          setFormVisible(false);
          setEditing(null);
        }}
        onSubmit={(input) => {
          if (editing) updateMutation.mutate({ id: editing.id, input });
          else createMutation.mutate(input);
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  chipsWrap: {
    height: 56,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  chipsRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  chip: {
    flexShrink: 0,
    height: 36,
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
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 60,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeBody: { flex: 1 },
  rangeLabel: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  rangeMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.7 },
}));
