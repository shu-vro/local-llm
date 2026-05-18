import React, { forwardRef } from "react";
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Radius, Spacing, Typography } from "@/theme";

export interface TextInputProps extends RNTextInputProps {
  containerStyle?: ViewStyle;
  variant?: "outline" | "flat" | "naked";
  inputStyle?: TextStyle;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  function TextInput(
    {
      containerStyle,
      variant = "outline",
      inputStyle,
      style,
      ...rest
    }: TextInputProps,
    ref,
  ) {
    const { colors } = useTheme();
    const containerBg = (() => {
      switch (variant) {
        case "flat":
          return colors.surfaceMuted;
        case "naked":
          return "transparent";
        case "outline":
        default:
          return colors.surfaceElevated;
      }
    })();
    const borderColor = variant === "outline" ? colors.border : "transparent";
    const isMultiline = rest.multiline === true;

    return (
      <View
        style={[
          styles.container,
          isMultiline && styles.containerMultiline,
          { backgroundColor: containerBg, borderColor },
          containerStyle,
        ]}>
        <RNTextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          textAlignVertical={isMultiline ? "top" : "center"}
          {...rest}
          style={[
            styles.input,
            isMultiline && styles.inputMultiline,
            { color: colors.text },
            inputStyle,
            style,
          ]}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 44,
  },
  containerMultiline: {
    justifyContent: "flex-start",
    alignItems: "stretch",
    paddingVertical: Spacing.sm,
  },
  input: {
    fontSize: Typography.size.md,
    paddingVertical: Spacing.sm,
    margin: 0,
    flexGrow: 0,
  },
  inputMultiline: {
    paddingVertical: Spacing.xs,
    width: "100%",
  },
});
