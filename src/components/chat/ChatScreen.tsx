import { useRouter, type Href } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { PreparedAttachment } from "@/ai/attachmentPipeline";
import {
  estimateHistoryTokens,
  trimHistoryForContext,
} from "@/ai/contextBudget";
import { SYSTEM_PROMPT } from "@/ai/promptBuilder";
import { Message } from "@/db/repositories/messagesRepo";
import { useCactus } from "@/hooks/useCactus";
import { useChatGeneration } from "@/hooks/useChatGeneration";
import { useDatabase } from "@/hooks/useDatabase";
import { useGenerationMessageSync } from "@/hooks/useGenerationMessageSync";
import { useMessages } from "@/hooks/useMessages";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { useThreads } from "@/hooks/useThreads";
import { Spacing, Typography } from "@/theme";

import { ChatHeader } from "./ChatHeader";
import { Composer } from "./Composer";
import { ContextUsageBar } from "./ContextUsageBar";
import { MessageList } from "./MessageList";
import { ModelGate } from "./ModelGate";
import { ThreadDrawer } from "./ThreadDrawer";

import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { SparkleIcon } from "@/components/common/Icons";
import { Modal } from "@/components/common/Modal";
import { TextInput } from "@/components/common/TextInput";

export interface ChatScreenProps {
  threadId: string | null;
}

const NEW_THREAD_TITLE = "New chat";

export function ChatScreen({ threadId }: ChatScreenProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { repos } = useDatabase();
  const { status, controller } = useCactus();
  const generation = useChatGeneration();
  const { settings } = useSettings();
  const {
    messages,
    attachmentsByMessage,
    loading,
    hasMore,
    refresh,
    loadOlder,
    applyLocal,
  } = useMessages(threadId);
  const { createThread, refresh: refreshThreads } = useThreads();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTitle, setActiveTitle] = useState<string>(NEW_THREAD_TITLE);
  const [editTarget, setEditTarget] = useState<Message | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!threadId || !repos) {
        setActiveTitle(NEW_THREAD_TITLE);
        return;
      }
      const t = await repos.threads.getById(threadId);
      if (!cancelled) setActiveTitle(t?.title ?? NEW_THREAD_TITLE);
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, repos]);

  const handleGenerationTerminal = useCallback(() => {
    // Message content/status is applied via useGenerationMessageSync — avoid
    // reloading from DB here, which could briefly show a truncated answer.
    void refreshThreads();
    if (repos && threadId) {
      void repos.threads
        .getById(threadId)
        .then((t) => {
          if (t) setActiveTitle(t.title);
        })
        .catch(() => undefined);
    }
  }, [refreshThreads, repos, threadId]);

  useGenerationMessageSync(
    controller,
    threadId,
    applyLocal,
    handleGenerationTerminal,
  );

  useEffect(() => {
    const ev = generation.lastEvent;
    if (!ev || !threadId || ev.threadId !== threadId) return;
    if (ev.type === "title" && ev.title) {
      setActiveTitle(ev.title);
      void refreshThreads();
    }
  }, [generation.lastEvent, refreshThreads, threadId]);

  const ensureThread = useCallback(async (): Promise<string> => {
    if (threadId) return threadId;
    const id = await createThread();
    router.replace(`/chat/${id}`);
    return id;
  }, [createThread, router, threadId]);

  const handleSend = useCallback(
    async (content: string, attachments: PreparedAttachment[]) => {
      try {
        const id = await ensureThread();
        await generation.send(id, content, attachments);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("not been downloaded")) {
          router.push("/models" as Href);
        } else {
          Alert.alert("Could not send", message);
        }
      }
    },
    [ensureThread, generation, router],
  );

  const handleCopy = useCallback(() => {}, []);

  const handleDelete = useCallback(
    (m: Message) => {
      if (!repos) return;
      Alert.alert("Delete message", "Remove this message from this chat?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await repos.messages.remove(m.id);
            await refresh();
          },
        },
      ]);
    },
    [refresh, repos],
  );

  const handleRegenerate = useCallback(
    async (m: Message) => {
      if (!threadId) return;
      try {
        await generation.regenerate(threadId, m.id);
      } catch (err) {
        Alert.alert(
          "Could not regenerate",
          err instanceof Error ? err.message : String(err),
        );
      }
    },
    [generation, threadId],
  );

  const handleEdit = useCallback(
    (m: Message) => {
      if (!threadId) return;
      setEditTarget(m);
      setEditDraft(m.content);
    },
    [threadId],
  );

  const submitEdit = useCallback(async () => {
    if (!editTarget || !threadId) return;
    const next = editDraft.trim();
    if (!next) {
      setEditTarget(null);
      return;
    }
    try {
      await generation.editAndRegenerate(threadId, editTarget.id, next);
      setEditTarget(null);
    } catch (err) {
      Alert.alert(
        "Could not edit",
        err instanceof Error ? err.message : String(err),
      );
    }
  }, [editDraft, editTarget, generation, threadId]);

  const composerDisabled = !status.isDownloaded || !status.isInitialized;
  const composerDisabledReason = !status.isDownloaded
    ? "Download a model first"
    : !status.isInitialized
      ? "Initialize the model from Models"
      : undefined;

  const contextEstimate = useMemo(() => {
    if (messages.length === 0) return null;
    const trimmed = trimHistoryForContext(
      messages,
      attachmentsByMessage,
      settings.maxContextTokens,
    );
    return {
      used: estimateHistoryTokens(
        trimmed.messages,
        attachmentsByMessage,
        SYSTEM_PROMPT.length,
      ),
      max: settings.maxContextTokens,
      trimmed: trimmed.trimmedCount > 0,
    };
  }, [attachmentsByMessage, messages, settings.maxContextTokens]);

  const liveMetrics =
    generation.activeThreadId === threadId ? generation.metrics : null;
  const contextBar = liveMetrics?.contextTokensUsed
    ? {
        used: liveMetrics.contextTokensUsed,
        max: liveMetrics.contextTokensMax ?? settings.maxContextTokens,
        trimmed: liveMetrics.contextTrimmed,
      }
    : contextEstimate;

  const emptyComponent = useMemo(
    () => (
      <EmptyState
        icon={<SparkleIcon size={28} color={colors.accent} />}
        title="A private, on-device assistant"
        description="Everything you type, every reply, and every attachment stays on this device. Start a conversation below."
      />
    ),
    [colors.accent],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <SafeAreaView
          edges={["top"]}
          style={{ backgroundColor: colors.background }}>
          <ChatHeader
            title={activeTitle}
            modelReady={status.isDownloaded}
            isGenerating={
              generation.isGenerating && generation.activeThreadId === threadId
            }
            onOpenDrawer={() => setDrawerOpen(true)}
            onNewChat={async () => {
              const id = await createThread();
              router.replace(`/chat/${id}`);
            }}
            onPressModel={() => router.push("/models" as Href)}
          />
        </SafeAreaView>

        <ModelGate />

        <View style={styles.flex}>
          <MessageList
            messages={messages}
            attachmentsByMessage={attachmentsByMessage}
            loading={loading}
            loadingOlder={hasMore && loading}
            onLoadOlder={loadOlder}
            onCopy={handleCopy}
            onDelete={handleDelete}
            onRegenerate={handleRegenerate}
            onEdit={handleEdit}
            emptyComponent={emptyComponent}
          />
        </View>

        <View
          style={{
            backgroundColor: colors.composerBg,
            paddingBottom: insets.bottom,
          }}>
          {contextBar && messages.length > 0 ? (
            <ContextUsageBar
              usedTokens={contextBar.used}
              maxTokens={contextBar.max}
              trimmed={contextBar.trimmed}
            />
          ) : null}
          <Composer
            threadId={threadId ?? "pending"}
            disabled={composerDisabled}
            disabledReason={composerDisabledReason}
            isGenerating={
              generation.isGenerating && generation.activeThreadId === threadId
            }
            onSend={handleSend}
            onStop={generation.cancel}
          />
        </View>
      </KeyboardAvoidingView>

      <ThreadDrawer
        visible={drawerOpen}
        activeThreadId={threadId}
        onClose={() => setDrawerOpen(false)}
        onSelect={(id) => router.replace(`/chat/${id}`)}
        onNewChat={async () => {
          const id = await createThread();
          router.replace(`/chat/${id}`);
          return id;
        }}
      />

      <Modal
        visible={editTarget !== null}
        onClose={() => setEditTarget(null)}
        align="center"
        contentStyle={{ gap: Spacing.md }}>
        <Text style={[styles.editTitle, { color: colors.text }]}>
          Edit message
        </Text>
        <Text style={[styles.editHint, { color: colors.textMuted }]}>
          The conversation will be regenerated from this point.
        </Text>
        <TextInput
          variant="flat"
          multiline
          blurOnSubmit={false}
          autoFocus
          value={editDraft}
          onChangeText={setEditDraft}
          containerStyle={{ minHeight: 160, alignItems: "stretch" }}
          inputStyle={{ textAlignVertical: "top" }}
          style={{ minHeight: 140, maxHeight: 280, textAlignVertical: "top" }}
        />
        <View style={styles.editActions}>
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => setEditTarget(null)}
          />
          <Button title="Save & regenerate" onPress={() => void submitEdit()} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  spacer: { width: Spacing.lg },
  editTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
  },
  editHint: { fontSize: Typography.size.sm },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
