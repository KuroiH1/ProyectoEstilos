import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Category } from "@/src/api";
import { useConfirm } from "@/src/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/src/components/empty-state";
import { Icon } from "@/src/components/icon";
import { NamePrompt } from "@/src/components/name-prompt";
import { ScreenHeader } from "@/src/components/screen-header";
import { useToast } from "@/src/components/toast";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function SettingsCategories() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: api.listCategories,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createCategory(name),
    onSuccess: () => {
      invalidate();
      toast("Categoría creada", "success");
      setAdding(false);
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.updateCategory(id, name),
    onSuccess: () => {
      invalidate();
      toast("Categoría actualizada", "success");
      setEditing(null);
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => {
      invalidate();
      toast("Categoría eliminada", "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const handleDelete = async (cat: Category) => {
    const ok = await confirm({
      title: "¿Eliminar categoría?",
      message: `Se eliminará "${cat.name}". No se permite si tiene equipos registrados.`,
      destructive: true,
    });
    if (ok) deleteMutation.mutate(cat.id);
  };

  const categories = data ?? [];

  const renderBody = () => {
    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState onRetry={refetch} />;
    if (categories.length === 0) {
      return (
        <EmptyState
          icon="pricetags-outline"
          title="Sin categorías"
          message="Crea tu primer tipo de producto."
          actionLabel="Añadir Categoría"
          onAction={() => setAdding(true)}
        />
      );
    }
    return (
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24, gap: spacing.md }}
        renderItem={({ item }: { item: Category }) => (
          <View style={styles.row} testID={`category-config-${item.id}`}>
            <View style={styles.rowIcon}>
              <Icon name="pricetag" size={20} color={colors.brand} />
            </View>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Pressable
              testID={`rename-category-${item.id}`}
              onPress={() => setEditing(item)}
              hitSlop={8}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            >
              <Icon name="create-outline" size={20} color={colors.onSurfaceSecondary} />
            </Pressable>
            <Pressable
              testID={`delete-category-${item.id}`}
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
        title="Categorías"
        onBack={() => router.back()}
        right={
          <Pressable testID="add-category-header" onPress={() => setAdding(true)} hitSlop={10} style={styles.iconBtn}>
            <Icon name="add" size={24} color={colors.brand} />
          </Pressable>
        }
      />
      {renderBody()}

      <NamePrompt
        visible={adding}
        title="Nueva categoría"
        placeholder="Ej. Celulares"
        submitLabel="Crear"
        onClose={() => setAdding(false)}
        onSubmit={(v) => createMutation.mutate(v)}
      />
      <NamePrompt
        visible={!!editing}
        title="Renombrar categoría"
        placeholder="Nombre"
        initialValue={editing?.name ?? ""}
        onClose={() => setEditing(null)}
        onSubmit={(v) => editing && updateMutation.mutate({ id: editing.id, name: v })}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 60,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { flex: 1, color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.7 },
}));
