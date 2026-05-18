import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Radius, Spacing, Typography } from "@/theme";

export interface CapabilityChipsProps {
  chips: string[];
  max?: number;
}

export function CapabilityChips({ chips, max = 6 }: CapabilityChipsProps) {
  const { colors } = useTheme();
  const visible = chips.slice(0, max);
  return (
    <View style={styles.row}>
      {visible.map((label) => (
        <View
          key={label}
          style={[styles.chip, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.text, { color: colors.textMuted }]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  text: { fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
});
