// Design tokens for ElectroGestor. Light + Dark themes (professional blue).
//
// The keys match the "color" block of /app/design_guidelines.json. A plain key
// is a background; its `on` partner is the text/icon color on top of it.
// Build StyleSheets with makeStyles(); read useTheme().colors for color props.
// Never write color literals in components; never call StyleSheet.create with
// colors at module level.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FFFFFF",
  onSurface: "#111827",
  surfaceSecondary: "#F3F4F6",
  onSurfaceSecondary: "#374151",
  surfaceTertiary: "#E5E7EB",
  onSurfaceTertiary: "#4B5563",
  surfaceInverse: "#1F2937",
  onSurfaceInverse: "#F9FAFB",

  brand: "#0A5CFF",
  onBrand: "#FFFFFF",
  brandPrimary: "#0047AB",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#3377FF",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#E0EBFF",
  onBrandTertiary: "#003380",

  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",

  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  divider: "#F3F4F6",
  muted: "#6B7280",
};

const dark: typeof light = {
  surface: "#0B0F19",
  onSurface: "#F9FAFB",
  surfaceSecondary: "#151C2D",
  onSurfaceSecondary: "#D1D5DB",
  surfaceTertiary: "#1F2937",
  onSurfaceTertiary: "#9CA3AF",
  surfaceInverse: "#F3F4F6",
  onSurfaceInverse: "#111827",

  brand: "#3377FF",
  onBrand: "#FFFFFF",
  brandPrimary: "#3377FF",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#5C95FF",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#1E3A8A",
  onBrandTertiary: "#BFDBFE",

  success: "#059669",
  onSuccess: "#FFFFFF",
  warning: "#D97706",
  onWarning: "#FFFFFF",
  error: "#DC2626",
  onError: "#FFFFFF",
  info: "#2563EB",
  onInfo: "#FFFFFF",

  border: "#1F2937",
  borderStrong: "#374151",
  divider: "#151C2D",
  muted: "#9CA3AF",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 } as const;
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 } as const;
export const fontSize = { sm: 12, base: 14, lg: 16, xl: 20, "2xl": 24, "3xl": 30 } as const;

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
