import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Icon } from "@/src/components/icon";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function EmptyState({
  icon = "cube-outline",
  title,
  message,
  actionLabel,
  onAction,
  testID,
}: {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.container} testID={testID ?? "empty-state"}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={44} color={colors.brand} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          testID="empty-state-action"
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Icon name="add" size={20} color={colors.onBrandPrimary} />
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function LoadingState() {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.container} testID="loading-state">
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.container} testID="error-state">
      <View style={styles.iconCircle}>
        <Icon name="cloud-offline-outline" size={44} color={colors.error} />
      </View>
      <Text style={styles.title}>No se pudo cargar</Text>
      <Text style={styles.message}>{message ?? "Revisa tu conexión e inténtalo de nuevo."}</Text>
      {onRetry ? (
        <Pressable
          testID="error-retry"
          onPress={onRetry}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Icon name="refresh" size={20} color={colors.onBrandPrimary} />
          <Text style={styles.actionText}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "700", textAlign: "center" },
  message: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  actionText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
}));
