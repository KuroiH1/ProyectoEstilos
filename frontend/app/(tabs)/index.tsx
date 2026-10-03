import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Category } from "@/src/api";
import { EmptyState, ErrorState, LoadingState } from "@/src/components/empty-state";
import { Icon } from "@/src/components/icon";
import { NamePrompt } from "@/src/components/name-prompt";
import { ScreenHeader } from "@/src/components/screen-header";
import { useToast } from "@/src/components/toast";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useCurrentUser } from "@/src/user";

const ICONS = ["phone-portrait", "tv", "laptop", "tablet-portrait", "headset", "hardware-chip"];

function iconFor(index: number): string {
  return ICONS[index % ICONS.length];
}

export default function Home() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { name } = useCurrentUser();
  const [promptVisible, setPromptVisible] = useState(false);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: api.listCategories,
  });

  const createMutation = useMutation({
    mutationFn: (value: string) => api.createCategory(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast("Categoría creada", "success");
      setPromptVisible(false);
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const categories = data ?? [];

  const renderBody = () => {
    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState onRetry={refetch} />;
    if (categories.length === 0) {
      return (
        <EmptyState
          icon="cube-outline"
          title="No hay categorías registradas"
          message="Crea tu primer tipo de producto para empezar a registrar equipos."
          actionLabel="Añadir Categoría"
          onAction={() => setPromptVisible(true)}
        />
      );
    }
    return (
      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: bottomChrome + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((cat: Category, i: number) => (
          <Pressable
            key={cat.id}
            testID={`category-card-${cat.id}`}
            onPress={() => router.push({ pathname: "/category", params: { id: cat.id, name: cat.name } })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardIcon}>
              <Icon name={iconFor(i)} size={26} color={colors.brand} />
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {cat.name}
            </Text>
            <View style={styles.cardChevron}>
              <Icon name="chevron-forward" size={18} color={colors.muted} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Categorías" subtitle={name ? `Hola, ${name}` : undefined} />
      <View style={styles.body}>{renderBody()}</View>

      {categories.length > 0 ? (
        <Pressable
          testID="add-category-fab"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setPromptVisible(true);
          }}
          style={({ pressed }) => [styles.fab, { bottom: bottomChrome + 16 }, pressed && styles.pressed]}
        >
          <Icon name="add" size={28} color={colors.onBrandPrimary} />
        </Pressable>
      ) : null}

      <NamePrompt
        visible={promptVisible}
        title="Nueva categoría"
        placeholder="Ej. Celulares"
        submitLabel="Crear"
        onClose={() => setPromptVisible(false)}
        onSubmit={(v) => createMutation.mutate(v)}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    width: "47%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 130,
  },
  pressed: { opacity: 0.85 },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  cardChevron: { position: "absolute", top: spacing.md, right: spacing.md },
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
}));
