import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconButton } from "@/components/common/IconButton";
import { BackIcon } from "@/components/common/Icons";
import { LoadingState } from "@/components/common/LoadingState";
import { TextInput } from "@/components/common/TextInput";
import { ModelDetailSheet } from "@/components/models/ModelDetailSheet";
import { ProviderSection } from "@/components/models/ProviderSection";
import { useCactus } from "@/hooks/useCactus";
import { CatalogTab, useModelCatalog } from "@/hooks/useModelCatalog";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/theme";

const TABS: { id: CatalogTab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "all", label: "All" },
  { id: "downloaded", label: "Downloaded" },
];

export default function ModelsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    status,
    installedStates,
    downloadModel,
    deleteModel,
    setActiveModel,
    initializeModel,
  } = useCactus();
  const {
    catalogLoading,
    query,
    setQuery,
    tab,
    setTab,
    groups,
    activeDisplayId,
    refreshCatalog,
  } = useModelCatalog();

  const [detailId, setDetailId] = useState<string | null>(null);
  const detailModel =
    detailId != null
      ? (groups
          .flatMap((g) => g.models)
          .find((m) => m.displayId === detailId) ?? null)
      : null;

  const onSelectModel = useCallback((displayId: string) => {
    setDetailId(displayId);
  }, []);

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
            Models
          </Text>
          <Pressable onPress={() => void refreshCatalog()} hitSlop={8}>
            <Text style={[styles.refresh, { color: colors.accent }]}>
              Refresh
            </Text>
          </Pressable>
        </View>

        <TextInput
          variant="flat"
          placeholder="Search models, params, providers…"
          value={query}
          onChangeText={setQuery}
          containerStyle={{
            marginHorizontal: Spacing.lg,
            marginBottom: Spacing.sm,
          }}
        />

        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                onPress={() => setTab(t.id)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : colors.surfaceMuted,
                  },
                ]}>
                <Text
                  style={{
                    color: active ? colors.primaryText : colors.text,
                    fontWeight: Typography.weight.medium,
                    fontSize: Typography.size.sm,
                  }}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {catalogLoading ? (
          <LoadingState label="Loading model catalog…" />
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            {groups.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                No models match your search.
              </Text>
            ) : (
              groups.map((g) => (
                <ProviderSection
                  key={g.id}
                  group={g}
                  activeDisplayId={activeDisplayId}
                  installedStates={installedStates}
                  onSelectModel={onSelectModel}
                />
              ))
            )}
            <Text style={[styles.footer, { color: colors.textMuted }]}>
              Download sizes are estimates for quantized weights. Actual storage
              may vary. All inference runs on-device with cloud handoff
              disabled.
            </Text>
          </ScrollView>
        )}
      </SafeAreaView>

      <ModelDetailSheet
        model={detailModel}
        install={detailId ? installedStates.get(detailId) : undefined}
        isActive={detailId === activeDisplayId}
        visible={detailId != null}
        onClose={() => setDetailId(null)}
        onDownload={downloadModel}
        onSetActive={setActiveModel}
        onDelete={deleteModel}
        onInitialize={initializeModel}
        isActiveReady={status.isInitialized && status.isDownloaded}
      />
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
    flex: 1,
    textAlign: "center",
  },
  refresh: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    paddingHorizontal: Spacing.sm,
  },
  tabs: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    alignItems: "center",
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.huge,
    gap: Spacing.lg,
  },
  empty: {
    textAlign: "center",
    fontSize: Typography.size.md,
    marginTop: Spacing.xl,
  },
  footer: {
    fontSize: Typography.size.xs,
    lineHeight: Typography.size.xs * Typography.lineHeight.relaxed,
    marginTop: Spacing.md,
  },
});
