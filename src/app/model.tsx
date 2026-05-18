import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/common/Button";
import { IconButton } from "@/components/common/IconButton";
import { BackIcon, SparkleIcon } from "@/components/common/Icons";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Surface } from "@/components/common/Surface";

import { useCactus } from "@/hooks/useCactus";
import { useTheme } from "@/hooks/useTheme";
import { MODEL_DISPLAY_NAME, Spacing, Typography } from "@/theme";

import { LoadingState } from "@/components/common/LoadingState";

export default function ModelScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { status, isClientReady, downloadModel, initializeModel } = useCactus();

  const handleDownload = async () => {
    if (!isClientReady) {
      Alert.alert(
        "Please wait",
        "The on-device engine is still starting. Try again in a moment.",
      );
      return;
    }
    try {
      await downloadModel();
      await initializeModel();
    } catch (err) {
      Alert.alert(
        "Download failed",
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <IconButton
            accessibilityLabel="Back"
            size={40}
            onPress={() => router.back()}>
            <BackIcon size={24} color={colors.text} />
          </IconButton>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            On-device model
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          {!isClientReady ? (
            <LoadingState label="Starting on-device engine…" />
          ) : null}
          <Surface variant="elevated" radius="xl" padded style={styles.card}>
            <View style={styles.hero}>
              <SparkleIcon size={32} color={colors.accent} />
              <Text style={[styles.modelName, { color: colors.text }]}>
                {MODEL_DISPLAY_NAME}
              </Text>
              <Text style={[styles.modelMeta, { color: colors.textMuted }]}>
                Multimodal · runs entirely on this device
              </Text>
            </View>
            <Text style={[styles.body, { color: colors.text }]}>
              This is a one-time download. After it finishes, the assistant will
              work fully offline. The model is stored on this device only.
            </Text>
            {status.isDownloading ? (
              <View style={styles.progressRow}>
                <ProgressBar progress={status.downloadProgress} height={8} />
                <Text
                  style={[styles.progressText, { color: colors.textMuted }]}>
                  {Math.round(status.downloadProgress * 100)}%
                </Text>
              </View>
            ) : null}
            {!status.isDownloading && status.error ? (
              <Text style={[styles.error, { color: colors.danger }]}>
                {status.error}
              </Text>
            ) : null}
            <View style={styles.actions}>
              {status.isDownloaded ? (
                <Button
                  title={
                    status.isInitialized
                      ? "Model ready"
                      : status.isInitializing
                        ? "Initializing…"
                        : "Initialize"
                  }
                  fullWidth
                  disabled={status.isInitialized}
                  loading={status.isInitializing}
                  onPress={async () => {
                    try {
                      await initializeModel();
                    } catch (err) {
                      Alert.alert(
                        "Initialization failed",
                        err instanceof Error ? err.message : String(err),
                      );
                    }
                  }}
                />
              ) : (
                <Button
                  title={
                    status.isDownloading
                      ? "Downloading…"
                      : status.error
                        ? "Retry download"
                        : "Download model"
                  }
                  fullWidth
                  loading={status.isDownloading}
                  disabled={!isClientReady}
                  onPress={handleDownload}
                />
              )}
            </View>
          </Surface>

          <Surface
            variant="muted"
            radius="lg"
            padded
            style={styles.privacyCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              What stays private
            </Text>
            <Text style={[styles.privacyLine, { color: colors.textMuted }]}>
              • No telemetry, analytics, or remote logging.
            </Text>
            <Text style={[styles.privacyLine, { color: colors.textMuted }]}>
              • Cloud handoff is disabled at the SDK call level.
            </Text>
            <Text style={[styles.privacyLine, { color: colors.textMuted }]}>
              • Messages, attachments, and chats live in local SQLite and the
              app sandbox.
            </Text>
            <Text style={[styles.privacyLine, { color: colors.textMuted }]}>
              • The only network use is the one-time model download.
            </Text>
          </Surface>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
  },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.huge, gap: Spacing.lg },
  card: { gap: Spacing.md },
  hero: { alignItems: "center", gap: Spacing.xs, marginBottom: Spacing.sm },
  modelName: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.semibold,
    textAlign: "center",
  },
  modelMeta: { fontSize: Typography.size.sm, textAlign: "center" },
  body: {
    fontSize: Typography.size.md,
    lineHeight: Typography.size.md * Typography.lineHeight.relaxed,
    textAlign: "center",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  progressText: {
    fontSize: Typography.size.sm,
    minWidth: 40,
    textAlign: "right",
  },
  error: {
    fontSize: Typography.size.sm,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  actions: { marginTop: Spacing.md },
  privacyCard: { gap: Spacing.xs },
  sectionTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.xs,
  },
  privacyLine: {
    fontSize: Typography.size.sm,
    lineHeight: Typography.size.sm * Typography.lineHeight.relaxed,
  },
});
