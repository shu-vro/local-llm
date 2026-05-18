import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/theme";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  style,
}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  icon: { marginBottom: Spacing.md },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.semibold,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: Typography.size.md,
    textAlign: "center",
    maxWidth: 360,
    lineHeight: Typography.size.md * Typography.lineHeight.relaxed,
  },
  action: { marginTop: Spacing.lg },
});
