import React from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Radius, Spacing, Typography } from "@/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<
  PressableProps,
  "style" | "children"
> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading,
  leadingIcon,
  trailingIcon,
  disabled,
  style,
  fullWidth,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();

  const palette = (() => {
    switch (variant) {
      case "primary":
        return {
          bg: colors.primary,
          fg: colors.primaryText,
          border: "transparent",
        };
      case "secondary":
        return { bg: colors.surface, fg: colors.text, border: colors.border };
      case "ghost":
        return { bg: "transparent", fg: colors.text, border: "transparent" };
      case "danger":
        return { bg: colors.danger, fg: "#FFFFFF", border: "transparent" };
    }
  })();

  const dims = (() => {
    switch (size) {
      case "sm":
        return { h: 34, px: Spacing.md, fs: Typography.size.sm };
      case "lg":
        return { h: 52, px: Spacing.xl, fs: Typography.size.lg };
      case "md":
      default:
        return { h: 44, px: Spacing.lg, fs: Typography.size.md };
    }
  })();

  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          height: dims.h,
          paddingHorizontal: dims.px,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? "stretch" : undefined,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {leadingIcon ? (
            <View style={styles.leading}>{leadingIcon}</View>
          ) : null}
          <Text
            allowFontScaling
            style={[
              styles.text,
              {
                color: palette.fg,
                fontSize: dims.fs,
                fontWeight: Typography.weight.semibold,
              },
            ]}>
            {title}
          </Text>
          {trailingIcon ? (
            <View style={styles.trailing}>{trailingIcon}</View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: "row", alignItems: "center" },
  leading: { marginRight: Spacing.sm },
  trailing: { marginLeft: Spacing.sm },
  text: { textAlign: "center" },
});
