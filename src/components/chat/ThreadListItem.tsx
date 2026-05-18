import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ThreadWithPreview } from "@/db/repositories/threadsRepo";
import { useTheme } from "@/hooks/useTheme";
import { Radius, Spacing, Typography } from "@/theme";
import { relativeTime } from "@/utils/time";

import { PinIcon, PinOutlineIcon, TrashIcon } from "@/components/common/Icons";

export interface ThreadListItemProps {
  thread: ThreadWithPreview;
  active: boolean;
  onPress: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}

function previewText(thread: ThreadWithPreview): string {
  if (!thread.lastMessagePreview) return "No messages yet";
  const prefix = thread.lastMessageRole === "assistant" ? "AI · " : "";
  const single = thread.lastMessagePreview.replace(/\s+/g, " ").trim();
  return `${prefix}${single}`;
}

export function ThreadListItem({
  thread,
  active,
  onPress,
  onTogglePin,
  onDelete,
}: ThreadListItemProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open chat ${thread.title}`}
      onPress={() => onPress(thread.id)}
      onLongPress={() => onDelete(thread.id)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: active ? colors.surface : "transparent",
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            style={[styles.title, { color: colors.text }]}>
            {thread.title}
          </Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>
            {relativeTime(thread.updatedAt)}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.preview, { color: colors.textMuted }]}>
          {previewText(thread)}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={thread.pinned ? "Unpin chat" : "Pin chat"}
          hitSlop={8}
          onPress={() => onTogglePin(thread.id, !thread.pinned)}
          style={styles.actionBtn}>
          {thread.pinned ? (
            <PinIcon size={16} color={colors.accent} />
          ) : (
            <PinOutlineIcon size={16} color={colors.textMuted} />
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete chat ${thread.title}`}
          hitSlop={8}
          onPress={() => onDelete(thread.id)}
          style={styles.actionBtn}>
          <TrashIcon size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  title: {
    flex: 1,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.medium,
  },
  time: { fontSize: Typography.size.xs },
  preview: { fontSize: Typography.size.sm, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 2 },
  actionBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
