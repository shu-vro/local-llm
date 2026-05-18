import { useRouter, type Href } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/common/Button";
import { Divider } from "@/components/common/Divider";
import { IconButton } from "@/components/common/IconButton";
import { BackIcon, CheckIcon } from "@/components/common/Icons";
import { Surface } from "@/components/common/Surface";
import { TextInput } from "@/components/common/TextInput";

import { useActiveModel } from "@/hooks/useActiveModel";
import { useCactus } from "@/hooks/useCactus";
import { useDatabase } from "@/hooks/useDatabase";
import { useHuggingFaceToken } from "@/hooks/useHuggingFaceToken";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { deleteAllAttachments, deleteAllCorpus } from "@/native/fileStore";
import { Spacing, ThemePreference, Typography } from "@/theme";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function NumberRow({
  label,
  value,
  onChange,
  step,
  min,
  max,
  decimals = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  decimals?: number;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<string>(value.toFixed(decimals));

  const commit = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(
        decimals > 0 ? Number(clamped.toFixed(decimals)) : Math.round(clamped),
      );
      setDraft(
        decimals > 0 ? clamped.toFixed(decimals) : String(Math.round(clamped)),
      );
    } else {
      setDraft(value.toFixed(decimals));
    }
  };

  return (
    <View style={styles.numberRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={styles.numberControls}>
        <Pressable
          onPress={() =>
            onChange(Math.max(min, Number((value - step).toFixed(decimals))))
          }
          style={[styles.numberBtn, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.numberBtnText, { color: colors.text }]}>–</Text>
        </Pressable>
        <TextInput
          variant="flat"
          keyboardType="decimal-pad"
          value={draft}
          onChangeText={setDraft}
          onBlur={commit}
          containerStyle={{ width: 72, minHeight: 38, paddingVertical: 0 }}
          inputStyle={{ textAlign: "center" }}
        />
        <Pressable
          onPress={() =>
            onChange(Math.min(max, Number((value + step).toFixed(decimals))))
          }
          style={[styles.numberBtn, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.numberBtnText, { color: colors.text }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, preference, setPreference } = useTheme();
  const { settings, update } = useSettings();
  const { repos, reload } = useDatabase();
  const { status, refreshCorpus } = useCactus();
  const { displayName, deleteModel } = useActiveModel();
  const hf = useHuggingFaceToken();
  const [hfDraft, setHfDraft] = useState("");

  useEffect(() => {
    if (!hf.loading) setHfDraft(hf.token);
  }, [hf.loading, hf.token]);

  const handleDeleteAllData = useCallback(() => {
    Alert.alert(
      "Delete all local data?",
      "This removes every chat, message, attachment, saved memory, and setting on this device. The model file is kept unless you also delete it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: async () => {
            try {
              if (repos) {
                await repos.threads.deleteAll();
                await repos.settings.deleteAll();
              }
              deleteAllAttachments();
              deleteAllCorpus();
              await refreshCorpus();
              await reload();
              router.replace("/chat");
              Alert.alert("Deleted", "All local data was removed.");
            } catch (err) {
              Alert.alert(
                "Could not delete",
                err instanceof Error ? err.message : String(err),
              );
            }
          },
        },
      ],
    );
  }, [refreshCorpus, reload, repos, router]);

  const handleDeleteActiveModel = useCallback(() => {
    Alert.alert(
      "Delete active model?",
      `Remove ${displayName} weights from this device? Other chats and settings are kept.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteModel(status.modelId);
            } catch (err) {
              Alert.alert(
                "Could not delete",
                err instanceof Error ? err.message : String(err),
              );
            }
          },
        },
      ],
    );
  }, [deleteModel, displayName, status.modelId]);

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
            Settings
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Surface variant="elevated" radius="lg" padded style={styles.card}>
            <Text style={[styles.section, { color: colors.text }]}>
              Appearance
            </Text>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((opt) => {
                const active = preference === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${opt.label} theme`}
                    onPress={() => setPreference(opt.value)}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.surfaceMuted,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}>
                    <Text
                      style={{
                        color: active ? colors.primaryText : colors.text,
                        fontWeight: Typography.weight.medium,
                      }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Surface>

          <Surface variant="elevated" radius="lg" padded style={styles.card}>
            <Text style={[styles.section, { color: colors.text }]}>
              Inference
            </Text>
            <NumberRow
              label="Context messages"
              value={settings.contextMessageLimit}
              onChange={(v) => void update({ contextMessageLimit: v })}
              step={1}
              min={2}
              max={64}
            />
            <Divider />
            <NumberRow
              label="Context window (tokens)"
              value={settings.maxContextTokens}
              onChange={(v) => void update({ maxContextTokens: v })}
              step={512}
              min={1024}
              max={32768}
            />
            <Divider />
            <NumberRow
              label="Temperature"
              value={settings.temperature}
              onChange={(v) => void update({ temperature: v })}
              step={0.05}
              min={0}
              max={2}
              decimals={2}
            />
            <Divider />
            <NumberRow
              label="Top-p"
              value={settings.topP}
              onChange={(v) => void update({ topP: v })}
              step={0.05}
              min={0}
              max={1}
              decimals={2}
            />
            <Divider />
            <NumberRow
              label="Top-k"
              value={settings.topK}
              onChange={(v) => void update({ topK: v })}
              step={1}
              min={1}
              max={200}
            />
            <Divider />
            <NumberRow
              label="Max tokens"
              value={settings.maxTokens}
              onChange={(v) => void update({ maxTokens: v })}
              step={64}
              min={32}
              max={4096}
            />
            <Text style={[styles.helper, { color: colors.textMuted }]}>
              Reply length limit. If answers stop mid-sentence, increase this
              (default 2048).
            </Text>
          </Surface>

          <Surface variant="elevated" radius="lg" padded style={styles.card}>
            <Text style={[styles.section, { color: colors.text }]}>Model</Text>
            <Text style={[styles.body, { color: colors.text }]}>
              Active: {displayName}
            </Text>
            <Text style={[styles.helper, { color: colors.textMuted }]}>
              {status.isDownloaded
                ? status.isInitialized
                  ? "Ready for offline chat."
                  : "Downloaded — open Models to initialize."
                : "No model downloaded for chat yet."}
            </Text>
            <Text style={[styles.helper, { color: colors.textMuted }]}>
              Runs locally with no cloud handoff. Telemetry is disabled.
            </Text>
            <View style={styles.modelActions}>
              <Button
                title="Browse & manage models"
                variant="secondary"
                onPress={() => router.push("/models" as Href)}
                fullWidth
              />
            </View>
            {status.isDownloaded ? (
              <View style={styles.modelActions}>
                <Button
                  title="Delete active model from device"
                  variant="danger"
                  onPress={handleDeleteActiveModel}
                  fullWidth
                />
              </View>
            ) : null}
          </Surface>

          <Surface variant="elevated" radius="lg" padded style={styles.card}>
            <Text style={[styles.section, { color: colors.text }]}>
              Hugging Face
            </Text>
            <Text style={[styles.helper, { color: colors.textMuted }]}>
              Optional. Needed only for some gated models (e.g. certain Gemma
              weights). Stored locally in your app database and used for
              downloads only.
            </Text>
            <TextInput
              variant="flat"
              placeholder="hf_…"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              value={hfDraft}
              onChangeText={setHfDraft}
              containerStyle={{ marginTop: Spacing.sm }}
            />
            <View style={styles.hfActions}>
              <Button
                title="Save token"
                size="sm"
                onPress={() =>
                  void hf
                    .save(hfDraft)
                    .then(() =>
                      Alert.alert("Saved", "Hugging Face token updated."),
                    )
                }
              />
              {hf.hasToken ? (
                <Button
                  title="Clear"
                  size="sm"
                  variant="ghost"
                  onPress={() => {
                    void hf.clear().then(() => setHfDraft(""));
                  }}
                />
              ) : null}
            </View>
            {hf.hasToken ? (
              <Text style={[styles.helper, { color: colors.success }]}>
                Token saved
              </Text>
            ) : null}
          </Surface>

          <Surface variant="muted" radius="lg" padded style={styles.card}>
            <Text style={[styles.section, { color: colors.text }]}>
              Privacy
            </Text>
            <View style={styles.privacyRow}>
              <CheckIcon size={16} color={colors.success} />
              <Text style={[styles.privacyText, { color: colors.text }]}>
                Everything stays on-device. No telemetry, analytics, or remote
                logging.
              </Text>
            </View>
            <View style={styles.privacyRow}>
              <CheckIcon size={16} color={colors.success} />
              <Text style={[styles.privacyText, { color: colors.text }]}>
                Cloud handoff is disabled at every model call.
              </Text>
            </View>
            <View style={styles.privacyRow}>
              <CheckIcon size={16} color={colors.success} />
              <Text style={[styles.privacyText, { color: colors.text }]}>
                Attachments are saved inside this app&apos;s sandbox and never
                uploaded anywhere.
              </Text>
            </View>
          </Surface>

          <Surface variant="elevated" radius="lg" padded style={styles.card}>
            <Text style={[styles.section, { color: colors.text }]}>Data</Text>
            <Button
              title="Delete all local data"
              variant="danger"
              onPress={handleDeleteAllData}
              fullWidth
            />
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
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.huge },
  card: { gap: Spacing.sm },
  section: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.xs,
  },
  themeRow: { flexDirection: "row", gap: Spacing.sm },
  themeOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  numberControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  numberBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  numberBtnText: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
  },
  label: { fontSize: Typography.size.md },
  body: { fontSize: Typography.size.md, fontWeight: Typography.weight.medium },
  helper: { fontSize: Typography.size.sm, marginTop: Spacing.xs },
  modelActions: { marginTop: Spacing.sm },
  hfActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    alignItems: "center",
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  privacyText: {
    flex: 1,
    fontSize: Typography.size.sm,
    lineHeight: Typography.size.sm * Typography.lineHeight.relaxed,
  },
});
