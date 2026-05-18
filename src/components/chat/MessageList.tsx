import React, { useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Attachment } from "@/db/repositories/attachmentsRepo";
import { Message } from "@/db/repositories/messagesRepo";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/theme";

import { LoadingState } from "@/components/common/LoadingState";
import { MessageBubble } from "./MessageBubble";

export interface MessageListProps {
  messages: Message[];
  attachmentsByMessage: Map<string, Attachment[]>;
  loading?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
  onCopy?: (m: Message) => void;
  onDelete?: (m: Message) => void;
  onRegenerate?: (m: Message) => void;
  onEdit?: (m: Message) => void;
  emptyComponent?: React.ReactNode;
}

interface MessageRowItem {
  message: Message;
  attachments: Attachment[];
  isLastAssistant: boolean;
}

export function MessageList({
  messages,
  attachmentsByMessage,
  loading,
  loadingOlder,
  onLoadOlder,
  onCopy,
  onDelete,
  onRegenerate,
  onEdit,
  emptyComponent,
}: MessageListProps) {
  const { colors } = useTheme();
  const listRef = useRef<FlatList<MessageRowItem>>(null);

  const data = useMemo<MessageRowItem[]>(() => {
    let lastAssistantId: string | null = null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m && m.role === "assistant") {
        lastAssistantId = m.id;
        break;
      }
    }
    return messages.map((m) => ({
      message: m,
      attachments: attachmentsByMessage.get(m.id) ?? [],
      isLastAssistant: m.id === lastAssistantId,
    }));
  }, [attachmentsByMessage, messages]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MessageRowItem>) => (
      <MessageBubble
        message={item.message}
        attachments={item.attachments}
        onCopy={onCopy}
        onDelete={onDelete}
        onRegenerate={onRegenerate}
        onEdit={onEdit}
        isLastAssistant={item.isLastAssistant}
      />
    ),
    [onCopy, onDelete, onEdit, onRegenerate],
  );

  const keyExtractor = useCallback(
    (item: MessageRowItem) => item.message.id,
    [],
  );

  const onEndReached = useCallback(() => {
    if (onLoadOlder) onLoadOlder();
  }, [onLoadOlder]);

  const ListHeader = loadingOlder ? (
    <View style={styles.headerLoader}>
      <ActivityIndicator color={colors.textMuted} />
    </View>
  ) : null;

  const EmptyComponent = loading ? (
    <LoadingState label="Loading messages…" />
  ) : (
    (emptyComponent ?? (
      <View style={styles.emptyBox}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Start the conversation
        </Text>
        <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
          Your messages and the assistant&apos;s replies stay on this device.
          Nothing is sent to any server.
        </Text>
      </View>
    ))
  );

  if (messages.length === 0) {
    return <View style={styles.emptyContainer}>{EmptyComponent}</View>;
  }

  return (
    <FlatList
      ref={listRef}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={ListHeader}
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      removeClippedSubviews
      windowSize={11}
      initialNumToRender={15}
      maxToRenderPerBatch={20}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: Spacing.lg,
    flexGrow: 1,
  },
  emptyContainer: { flex: 1 },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.huge,
  },
  emptyTitle: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: Typography.size.md,
    textAlign: "center",
    maxWidth: 360,
    lineHeight: Typography.size.md * Typography.lineHeight.relaxed,
  },
  headerLoader: { paddingVertical: Spacing.md, alignItems: "center" },
});
