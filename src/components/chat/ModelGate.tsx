import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useCactus } from "@/hooks/useCactus";
import { useTheme } from "@/hooks/useTheme";
import { MODEL_DISPLAY_NAME, Spacing, Typography } from "@/theme";

import { Button } from "@/components/common/Button";
import { SparkleIcon } from "@/components/common/Icons";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Surface } from "@/components/common/Surface";

export interface ModelGateProps {
  variant?: "inline" | "block";
}

export function ModelGate({ variant = "inline" }: ModelGateProps) {
  const { status } = useCactus();
  const { colors } = useTheme();
  const router = useRouter();

  if (status.isDownloaded) return null;

  return (
    <Surface
      variant="muted"
      radius="lg"
      style={[
        styles.container,
        variant === "block" ? styles.block : styles.inline,
      ]}>
      <View style={styles.iconWrap}>
        <SparkleIcon size={26} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>
          Local model needs to be downloaded
        </Text>
        <Text
          style={[styles.body, { color: colors.textMuted }]}
          numberOfLines={3}>
          {MODEL_DISPLAY_NAME} is downloaded once and then runs entirely on this
          device. After the download, the app works fully offline.
        </Text>
        {status.isDownloading ? (
          <View style={styles.progressRow}>
            <ProgressBar progress={status.downloadProgress} />
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {Math.round(status.downloadProgress * 100)}%
            </Text>
          </View>
        ) : null}
        {!!status.error && !status.isDownloading ? (
          <Text style={[styles.error, { color: colors.danger }]}>
            {status.error}
          </Text>
        ) : null}
      </View>
      {!status.isDownloading ? (
        <Button
          title={status.error ? "Retry download" : "Download"}
          size="sm"
          onPress={() => router.push("/model")}
        />
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  inline: { marginHorizontal: Spacing.lg, marginTop: Spacing.sm },
  block: { margin: Spacing.lg },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
  },
  body: { fontSize: Typography.size.sm, marginTop: 2 },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  progressText: {
    fontSize: Typography.size.xs,
    minWidth: 36,
    textAlign: "right",
  },
  error: { fontSize: Typography.size.xs, marginTop: Spacing.xs },
});
