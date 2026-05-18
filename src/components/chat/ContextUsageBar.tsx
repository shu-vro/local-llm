import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { contextUsageRatio } from "@/ai/contextBudget";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/theme";

export interface ContextUsageBarProps {
  usedTokens: number;
  maxTokens: number;
  trimmed?: boolean;
}

export function ContextUsageBar({
  usedTokens,
  maxTokens,
  trimmed,
}: ContextUsageBarProps) {
  const { colors } = useTheme();
  const ratio = contextUsageRatio(usedTokens, maxTokens);
  const pct = Math.round(ratio * 100);
  const nearLimit = ratio >= 0.85;
  const fillColor = nearLimit ? colors.warning : colors.accent;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          Context {usedTokens.toLocaleString()} / {maxTokens.toLocaleString()}
        </Text>
        {trimmed ? (
          <Text style={[styles.trimmed, { color: colors.warning }]}>
            Trimmed
          </Text>
        ) : null}
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.max(2, pct)}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    gap: 4,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: Typography.size.xs },
  trimmed: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
});
