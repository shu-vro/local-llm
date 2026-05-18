import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/theme";

export interface LoadingStateProps {
  label?: string;
  inline?: boolean;
  style?: ViewStyle;
}

export function LoadingState({ label, inline, style }: LoadingStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[inline ? styles.inline : styles.full, style]}>
      <ActivityIndicator color={colors.textMuted} />
      {label ? (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  label: { fontSize: Typography.size.sm, marginTop: Spacing.xs },
});
