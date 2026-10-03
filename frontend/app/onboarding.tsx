import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { useToast } from "@/src/components/toast";
import { api } from "@/src/api";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { setStoredUserName } from "@/src/user";

export default function Onboarding() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Ingresa tu nombre para continuar");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.createUser(trimmed);
      await setStoredUserName(trimmed);
      router.replace("/(tabs)");
    } catch {
      // Offline-tolerant: keep the name locally even if the server is briefly unreachable.
      await setStoredUserName(trimmed);
      toast("Guardado. Sincronizaremos cuando haya conexión.", "info");
      router.replace("/(tabs)");
    } finally {
      setSaving(false);
    }
  };

  const gradient =
    scheme === "dark"
      ? ([colors.surface, "#10213F"] as const)
      : ([colors.brandTertiary, colors.surface] as const);

  return (
    <LinearGradient colors={gradient} style={styles.flex}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing["3xl"], paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Icon name="cube" size={28} color={colors.onBrandPrimary} />
          </View>
          <Text style={styles.brandName}>ElectroGestor</Text>
        </View>

        <Text style={styles.greeting}>Bienvenido</Text>
        <Text style={styles.sub}>
          Gestiona tu inventario y garantías. Dinos tu nombre para empezar; tus cambios se
          comparten con tu equipo.
        </Text>

        <Text style={styles.label}>Tu nombre</Text>
        <TextInput
          testID="onboarding-name-input"
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (error) setError(null);
          }}
          placeholder="Ej. Juan Pérez"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />
        {error ? (
          <Text style={styles.error} testID="onboarding-error">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          testID="onboarding-continue-button"
          onPress={handleContinue}
          disabled={saving}
          style={({ pressed }) => [styles.button, pressed && styles.pressed, saving && styles.disabled]}
        >
          {saving ? (
            <ActivityIndicator color={colors.onBrandPrimary} />
          ) : (
            <Text style={styles.buttonText}>Continuar</Text>
          )}
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing["2xl"] },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  greeting: { color: colors.onSurface, fontSize: 32, fontWeight: "800" },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: spacing.xl },
  label: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "600", marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 56,
    fontSize: 17,
    color: colors.onSurface,
  },
  error: { color: colors.error, fontSize: 13, marginTop: spacing.xs },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  button: {
    backgroundColor: colors.brandPrimary,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  buttonText: { color: colors.onBrandPrimary, fontSize: 17, fontWeight: "700" },
}));
