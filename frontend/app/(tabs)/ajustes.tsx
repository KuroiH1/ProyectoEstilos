import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/empty-state";
import { Icon } from "@/src/components/icon";
import { NamePrompt } from "@/src/components/name-prompt";
import { ScreenHeader } from "@/src/components/screen-header";
import { useToast } from "@/src/components/toast";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { setStoredUserName, useCurrentUser } from "@/src/user";

export default function Ajustes() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { name, refresh } = useCurrentUser();
  const [editName, setEditName] = useState(false);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const Row = ({
    icon,
    tint,
    title,
    subtitle,
    onPress,
    testID,
  }: {
    icon: string;
    tint: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    testID: string;
  }) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={20} color={colors.onBrandPrimary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <Icon name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Ajustes" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomChrome + 24, gap: spacing.xl }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CUENTA</Text>
          <View style={styles.group}>
            <Row
              testID="settings-change-name"
              icon="person"
              tint={colors.brandSecondary}
              title={name ?? "Usuario"}
              subtitle="Toca para cambiar tu nombre"
              onPress={() => setEditName(true)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONFIGURACIÓN</Text>
          <View style={styles.group}>
            <Row
              testID="settings-categories-row"
              icon="pricetags"
              tint={colors.brandPrimary}
              title="Categorías"
              subtitle="Crear, renombrar y eliminar tipos de producto"
              onPress={() => router.push("/settings-categories")}
            />
            <View style={styles.divider} />
            <Row
              testID="settings-warranty-row"
              icon="shield-checkmark"
              tint={colors.success}
              title="Reglas de garantía"
              subtitle="Rangos de precio por categoría"
              onPress={() => router.push("/settings-warranty")}
            />
          </View>
        </View>

        <View style={styles.info}>
          <EmptyState
            icon="sync-circle"
            title="Sincronización en la nube"
            message="Tus categorías, reglas y productos se comparten con tu equipo. Los cambios aparecen automáticamente."
          />
        </View>
      </ScrollView>

      <NamePrompt
        visible={editName}
        title="Cambiar nombre"
        placeholder="Tu nombre"
        initialValue={name ?? ""}
        onClose={() => setEditName(false)}
        onSubmit={async (v) => {
          await setStoredUserName(v);
          await refresh();
          setEditName(false);
          toast("Nombre actualizado", "success");
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginLeft: spacing.xs },
  group: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, minHeight: 64 },
  pressed: { opacity: 0.8 },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  rowSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider, marginLeft: 68 },
  info: { height: 260, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
}));
