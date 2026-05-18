import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CatalogModel } from "@/ai/modelCatalog";
import { sizeTierLabel } from "@/ai/modelSpec";
import type { ModelQuantization } from "@/ai/models";
import { useTheme } from "@/hooks/useTheme";
import { ModelInstallState } from "@/providers/CactusProvider";
import { Radius, Spacing, Typography } from "@/theme";

import { CapabilityChips } from "./CapabilityChips";

export interface ModelCardProps {
  model: CatalogModel;
  install?: ModelInstallState;
  isActive: boolean;
  onPress: () => void;
}

function statusLabel(
  isActive: boolean,
  install: ModelInstallState | undefined,
): string {
  if (isActive) return "Active";
  if (install?.isDownloading) return "Downloading…";
  if (install?.downloaded) return "Downloaded";
  return "Not downloaded";
}

export function ModelCard({
  model,
  install,
  isActive,
  onPress,
}: ModelCardProps) {
  const { colors } = useTheme();
  const quant: ModelQuantization =
    install?.quantization ?? model.quantizations[0] ?? "int4";
  const downloadLabel = model.downloadSizeLabel(quant);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: isActive ? colors.accent : colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {model.shortName}
          </Text>
          <Text
            style={[styles.meta, { color: colors.textMuted }]}
            numberOfLines={1}>
            {model.size.paramsLabel} params ·{" "}
            {sizeTierLabel(model.size.sizeTier)} · {downloadLabel} (
            {quant.toUpperCase()})
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isActive
                ? colors.accent
                : install?.downloaded
                  ? colors.success
                  : colors.surfaceMuted,
            },
          ]}>
          <Text
            style={[
              styles.badgeText,
              {
                color: isActive
                  ? colors.primaryText
                  : install?.downloaded
                    ? "#fff"
                    : colors.textMuted,
              },
            ]}>
            {statusLabel(isActive, install)}
          </Text>
        </View>
      </View>

      <Text
        style={[styles.desc, { color: colors.textMuted }]}
        numberOfLines={2}>
        {model.description}
      </Text>

      <CapabilityChips chips={model.capabilityChips} />

      {model.capabilities.gated ? (
        <Text style={[styles.gated, { color: colors.warning }]}>
          May require Hugging Face access for download
        </Text>
      ) : null}

      {!model.inRegistry ? (
        <Text style={[styles.gated, { color: colors.danger }]}>
          Not in registry — update the app or check connection
        </Text>
      ) : null}

      {install?.isDownloading ? (
        <Text style={[styles.progress, { color: colors.textMuted }]}>
          {Math.round((install.downloadProgress ?? 0) * 100)}%
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  name: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
  },
  meta: { fontSize: Typography.size.xs, marginTop: 2 },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
  desc: {
    fontSize: Typography.size.sm,
    lineHeight: Typography.size.sm * Typography.lineHeight.relaxed,
  },
  gated: { fontSize: Typography.size.xs },
  progress: { fontSize: Typography.size.xs },
});
