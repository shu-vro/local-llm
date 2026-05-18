import React from "react";
import { Pressable, PressableProps, StyleSheet, ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { HitSlop, Radius } from "@/theme";

export interface IconButtonProps extends Omit<
  PressableProps,
  "style" | "children"
> {
  children: React.ReactNode;
  size?: number;
  variant?: "plain" | "soft" | "solid" | "outline";
  style?: ViewStyle;
  accessibilityLabel: string;
}

export function IconButton({
  children,
  size = 40,
  variant = "plain",
  style,
  accessibilityLabel,
  disabled,
  ...rest
}: IconButtonProps) {
  const { colors } = useTheme();
  const bg = (() => {
    switch (variant) {
      case "soft":
        return colors.surfaceMuted;
      case "solid":
        return colors.primary;
      case "outline":
        return "transparent";
      case "plain":
      default:
        return "transparent";
    }
  })();
  const border = variant === "outline" ? colors.border : "transparent";

  return (
    <Pressable
      {...rest}
      hitSlop={HitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: Radius.pill,
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
