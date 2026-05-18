import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ProviderGroup } from "@/ai/modelCatalog";
import { useTheme } from "@/hooks/useTheme";
import { ModelInstallState } from "@/providers/CactusProvider";
import { Spacing, Typography } from "@/theme";

import { ModelCard } from "./ModelCard";

export interface ProviderSectionProps {
  group: ProviderGroup;
  activeDisplayId: string;
  installedStates: Map<string, ModelInstallState>;
  onSelectModel: (displayId: string) => void;
}

export function ProviderSection({
  group,
  activeDisplayId,
  installedStates,
  onSelectModel,
}: ProviderSectionProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((v) => !v)}
        style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {group.label}
        </Text>
        <Text style={[styles.count, { color: colors.textMuted }]}>
          {group.models.length} · {expanded ? "▾" : "▸"}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={styles.list}>
          {group.models.map((m) => (
            <ModelCard
              key={m.displayId}
              model={m}
              install={installedStates.get(m.displayId)}
              isActive={m.displayId === activeDisplayId}
              onPress={() => onSelectModel(m.displayId)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  title: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
  },
  count: { fontSize: Typography.size.sm },
  list: { gap: Spacing.sm },
});
