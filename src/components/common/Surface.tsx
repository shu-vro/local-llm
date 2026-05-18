import React from "react";
import { StyleSheet, View, ViewProps, ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Radius } from "@/theme";

export type SurfaceVariant = "flat" | "elevated" | "muted" | "outline";

export interface SurfaceProps extends ViewProps {
  variant?: SurfaceVariant;
  radius?: keyof typeof Radius;
  padded?: boolean;
}

export function Surface({
  variant = "flat",
  radius = "md",
  padded = false,
  style,
  children,
  ...rest
}: SurfaceProps) {
  const { colors } = useTheme();
  const base: ViewStyle = (() => {
    switch (variant) {
      case "elevated":
        return { backgroundColor: colors.surfaceElevated };
      case "muted":
        return { backgroundColor: colors.surfaceMuted };
      case "outline":
        return {
          backgroundColor: colors.background,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        };
      case "flat":
      default:
        return { backgroundColor: colors.surface };
    }
  })();

  return (
    <View
      {...rest}
      style={[
        base,
        { borderRadius: Radius[radius] },
        padded ? styles.padded : null,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 16 },
});
