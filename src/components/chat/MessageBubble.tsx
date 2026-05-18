import * as Clipboard from "expo-clipboard";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AttachmentBrief,
  AttachmentPreview,
  attachmentToBrief,
} from "./AttachmentPreview";
import { MarkdownMessage } from "./MarkdownMessage";
import { StreamingCursor } from "./StreamingCursor";

import { Attachment } from "@/db/repositories/attachmentsRepo";
import { Message } from "@/db/repositories/messagesRepo";
import { useTheme } from "@/hooks/useTheme";
import { Radius, Spacing, Typography } from "@/theme";
import { formatTime } from "@/utils/time";

import { IconButton } from "@/components/common/IconButton";
import {
  CopyIcon,
  EditIcon,
  RegenerateIcon,
  TrashIcon,
} from "@/components/common/Icons";

const USER_MAX_WIDTH = "88%" as const;

export interface MessageBubbleProps {
  message: Message;
  attachments?: Attachment[];
  onCopy?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onRegenerate?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  isLastAssistant?: boolean;
}

export function MessageBubble({
  message,
  attachments = [],
  onCopy,
  onDelete,
  onRegenerate,
  onEdit,
  isLastAssistant,
}: MessageBubbleProps) {
  const { colors } = useTheme();
  const [showActions, setShowActions] = useState(false);
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isFailed = message.status === "failed";
  const isCancelled = message.status === "cancelled";
  const tokensPerSecond =
    typeof message.metadata?.tokensPerSecond === "number"
      ? message.metadata.tokensPerSecond
      : null;
  const stoppedAtMaxTokens = message.metadata?.stoppedReason === "max_tokens";

  const briefs: AttachmentBrief[] = attachments.map(attachmentToBrief);

  const copy = useCallback(() => {
    void Clipboard.setStringAsync(message.content).catch(() => undefined);
    onCopy?.(message);
  }, [message, onCopy]);

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <Pressable
        accessibilityRole="text"
        onLongPress={() => setShowActions((v) => !v)}
        style={[
          styles.bubble,
          isUser
            ? {
                backgroundColor: colors.bubbleUser,
                maxWidth: USER_MAX_WIDTH,
                alignSelf: "flex-end",
              }
            : {
                backgroundColor: "transparent",
                alignSelf: "stretch",
                paddingHorizontal: 0,
              },
        ]}>
        {briefs.length > 0 ? (
          <View style={styles.attachments}>
            {briefs.map((a) => (
              <AttachmentPreview key={a.id} attachment={a} />
            ))}
          </View>
        ) : null}

        {isUser ? (
          message.content || isStreaming ? (
            <Text
              selectable
              style={[
                styles.text,
                {
                  color: colors.bubbleUserText,
                  fontSize: Typography.size.md,
                  lineHeight:
                    Typography.size.md * Typography.lineHeight.relaxed,
                },
              ]}>
              {message.content}
              {isStreaming ? "\u200B" : ""}
            </Text>
          ) : null
        ) : message.content || isStreaming ? (
          <MarkdownMessage
            markdown={message.content}
            isStreaming={isStreaming}
          />
        ) : null}

        {isStreaming && isUser ? (
          <View style={{ marginTop: 4 }}>
            <StreamingCursor visible />
          </View>
        ) : null}

        {isFailed && message.error ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {message.error}
          </Text>
        ) : null}
        {isCancelled ? (
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            Generation stopped.
          </Text>
        ) : null}
        {!isUser && tokensPerSecond != null && tokensPerSecond > 0 ? (
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {tokensPerSecond.toFixed(1)} tok/s
          </Text>
        ) : null}
        {!isUser && stoppedAtMaxTokens && !isStreaming ? (
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            Stopped at max tokens — raise the limit in Settings
          </Text>
        ) : null}
      </Pressable>

      <View
        style={[
          styles.actions,
          isUser ? styles.actionsRight : styles.actionsLeft,
        ]}>
        <Text style={[styles.timestamp, { color: colors.textMuted }]}>
          {formatTime(message.createdAt)}
        </Text>
        {showActions || !isUser ? (
          <View style={[styles.actionRow]}>
            {onCopy ? (
              <IconButton
                accessibilityLabel="Copy message"
                size={32}
                onPress={copy}>
                <CopyIcon size={16} color={colors.textMuted} />
              </IconButton>
            ) : null}
            {onEdit && isUser ? (
              <IconButton
                accessibilityLabel="Edit and regenerate"
                size={32}
                onPress={() => onEdit(message)}>
                <EditIcon size={16} color={colors.textMuted} />
              </IconButton>
            ) : null}
            {onRegenerate && !isUser && isLastAssistant ? (
              <IconButton
                accessibilityLabel="Regenerate response"
                size={32}
                onPress={() => onRegenerate(message)}>
                <RegenerateIcon size={16} color={colors.textMuted} />
              </IconButton>
            ) : null}
            {onDelete ? (
              <IconButton
                accessibilityLabel="Delete message"
                size={32}
                onPress={() => onDelete(message)}>
                <TrashIcon size={16} color={colors.textMuted} />
              </IconButton>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  rowUser: { alignItems: "flex-end" },
  rowAssistant: { alignItems: "stretch" },
  bubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
  },
  attachments: { marginBottom: Spacing.sm, gap: Spacing.xs },
  text: {
    fontWeight: Typography.weight.regular,
  },
  errorText: { marginTop: Spacing.sm, fontSize: Typography.size.sm },
  metaText: { marginTop: Spacing.sm, fontSize: Typography.size.xs },
  actions: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  actionsRight: { justifyContent: "flex-end" },
  actionsLeft: { justifyContent: "flex-start" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  timestamp: { fontSize: Typography.size.sm },
});
