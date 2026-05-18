import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { CatalogModel } from "@/ai/modelCatalog";
import { formatDownloadSize, sizeTierLabel } from "@/ai/modelSpec";
import type { ModelQuantization } from "@/ai/models";
import { useTheme } from "@/hooks/useTheme";
import { ModelInstallState } from "@/providers/CactusProvider";
import { Spacing, Typography } from "@/theme";

import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { ProgressBar } from "@/components/common/ProgressBar";

import { CapabilityChips } from "./CapabilityChips";

export interface ModelDetailSheetProps {
  model: CatalogModel | null;
  install?: ModelInstallState;
  isActive: boolean;
  visible: boolean;
  onClose: () => void;
  onDownload: (displayId: string, quant: ModelQuantization) => Promise<void>;
  onSetActive: (displayId: string) => Promise<void>;
  onDelete: (displayId: string) => Promise<void>;
  onInitialize?: () => Promise<void>;
  isActiveReady: boolean;
}

function SpecRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.specRow}>
      <Text style={[styles.specLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.specValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export function ModelDetailSheet({
  model,
  install,
  isActive,
  visible,
  onClose,
  onDownload,
  onSetActive,
  onDelete,
  onInitialize,
  isActiveReady,
}: ModelDetailSheetProps) {
  const { colors } = useTheme();
  const [quant, setQuant] = useState<ModelQuantization>(
    install?.quantization ?? model?.quantizations[0] ?? "int4",
  );

  if (!model) return null;

  const downloaded = install?.downloaded ?? false;
  const downloading = install?.isDownloading ?? false;

  return (
    <Modal visible={visible} onClose={onClose} align="bottom">
      <ScrollView
        style={{ maxHeight: 520 }}
        contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {model.shortName}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {model.displayId}
        </Text>

        <CapabilityChips chips={model.capabilityChips} max={10} />

        <View style={[styles.specs, { borderColor: colors.divider }]}>
          <SpecRow label="Parameters" value={model.size.paramsLabel} />
          <SpecRow
            label="Size tier"
            value={sizeTierLabel(model.size.sizeTier)}
          />
          <SpecRow
            label="Download (INT4)"
            value={formatDownloadSize(model.size.downloadMbInt4)}
          />
          {model.quantizations.includes("int8") ? (
            <SpecRow
              label="Download (INT8)"
              value={formatDownloadSize(model.size.downloadMbInt8)}
            />
          ) : null}
          <SpecRow label="Pipeline" value={model.pipelineTag} />
          {model.size.contextHint ? (
            <SpecRow label="Context" value={model.size.contextHint} />
          ) : null}
          <SpecRow
            label="Quantization"
            value={model.quantizations.map((q) => q.toUpperCase()).join(", ")}
          />
          <SpecRow
            label="Registry"
            value={model.inRegistry ? "Available" : "Unavailable"}
          />
        </View>

        <Text style={[styles.body, { color: colors.text }]}>
          {model.description}
        </Text>

        {model.capabilities.gated ? (
          <Text style={[styles.warn, { color: colors.warning }]}>
            Gated model: you may need a Hugging Face token to download weights.
          </Text>
        ) : null}

        <View style={styles.quantRow}>
          {model.quantizations.map((q) => (
            <Button
              key={q}
              title={q.toUpperCase()}
              size="sm"
              variant={quant === q ? "primary" : "secondary"}
              onPress={() => setQuant(q)}
            />
          ))}
        </View>

        {downloading ? (
          <View style={styles.progressWrap}>
            <ProgressBar progress={install?.downloadProgress ?? 0} />
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              Downloading… {Math.round((install?.downloadProgress ?? 0) * 100)}%
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {!downloaded ? (
            <Button
              title={downloading ? "Downloading…" : "Download"}
              fullWidth
              loading={downloading}
              disabled={!model.inRegistry || downloading}
              onPress={() => void onDownload(model.displayId, quant)}
            />
          ) : null}
          {downloaded && !isActive ? (
            <Button
              title="Use this model"
              fullWidth
              onPress={() =>
                void onSetActive(model.displayId)
                  .then(onClose)
                  .catch((e) => Alert.alert("Could not switch", String(e)))
              }
            />
          ) : null}
          {isActive && downloaded && !isActiveReady && onInitialize ? (
            <Button
              title="Initialize for chat"
              fullWidth
              onPress={() =>
                void onInitialize().catch((e) =>
                  Alert.alert("Initialization failed", String(e)),
                )
              }
            />
          ) : null}
          {downloaded ? (
            <Button
              title="Delete from device"
              variant="danger"
              fullWidth
              onPress={() => {
                Alert.alert(
                  "Delete model?",
                  `Remove ${model.shortName} weights from this device?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () =>
                        void onDelete(model.displayId)
                          .then(onClose)
                          .catch((e) =>
                            Alert.alert("Delete failed", String(e)),
                          ),
                    },
                  ],
                );
              }}
            />
          ) : null}
          <Button title="Close" variant="ghost" fullWidth onPress={onClose} />
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md, paddingBottom: Spacing.lg },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.semibold,
  },
  subtitle: { fontSize: Typography.size.xs },
  specs: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  specLabel: { fontSize: Typography.size.sm, flex: 1 },
  specValue: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    flex: 1,
    textAlign: "right",
  },
  body: {
    fontSize: Typography.size.sm,
    lineHeight: Typography.size.sm * Typography.lineHeight.relaxed,
  },
  warn: { fontSize: Typography.size.sm },
  quantRow: { flexDirection: "row", gap: Spacing.sm },
  progressWrap: { gap: Spacing.xs },
  progressText: { fontSize: Typography.size.xs },
  actions: { gap: Spacing.sm, marginTop: Spacing.sm },
});
