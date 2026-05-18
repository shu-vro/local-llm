import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useActiveModel } from "@/hooks/useActiveModel";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/theme";

import { IconButton } from "@/components/common/IconButton";
import { Dot, MenuIcon, NewChatIcon } from "@/components/common/Icons";

export interface ChatHeaderProps {
  title: string;
  modelReady: boolean;
  isGenerating: boolean;
  tokensPerSecond?: number;
  onOpenDrawer: () => void;
  onNewChat: () => void;
  onPressTitle?: () => void;
  onPressModel?: () => void;
}

export function ChatHeader({
  title,
  modelReady,
  isGenerating,
  tokensPerSecond,
  onOpenDrawer,
  onNewChat,
  onPressTitle,
  onPressModel,
}: ChatHeaderProps) {
  const { colors } = useTheme();
  const { displayName } = useActiveModel();
  const statusColor = isGenerating
    ? colors.warning
    : modelReady
      ? colors.success
      : colors.danger;
  const tpsLabel =
    isGenerating && tokensPerSecond != null && tokensPerSecond > 0
      ? ` · ${tokensPerSecond.toFixed(1)} tok/s`
      : "";
  const statusLabel = isGenerating
    ? `Thinking${tpsLabel}`
    : modelReady
      ? "Local · Ready"
      : "Local · Setup";

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: colors.divider,
          backgroundColor: colors.background,
        },
      ]}>
      <View style={styles.side}>
        <IconButton
          accessibilityLabel="Open chats"
          size={40}
          onPress={onOpenDrawer}>
          <MenuIcon size={24} color={colors.text} />
        </IconButton>
      </View>
      <Pressable onPress={onPressTitle} style={styles.center} hitSlop={6}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {title || "New chat"}
        </Text>
        <Pressable onPress={onPressModel} disabled={!onPressModel} hitSlop={8}>
          <View style={styles.statusRow}>
            <Dot size={6} color={statusColor} />
            <Text
              style={[styles.subtitle, { color: colors.textMuted }]}
              numberOfLines={1}>
              {displayName} · {statusLabel}
            </Text>
          </View>
        </Pressable>
      </Pressable>
      <View style={[styles.side, styles.sideEnd]}>
        <IconButton accessibilityLabel="New chat" size={40} onPress={onNewChat}>
          <NewChatIcon size={20} color={colors.text} />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { width: 56, alignItems: "flex-start" },
  sideEnd: { alignItems: "flex-end" },
  center: { flex: 1, alignItems: "center", paddingHorizontal: Spacing.sm },
  title: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    maxWidth: "100%",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: Spacing.xs,
  },
  subtitle: { fontSize: Typography.size.xs, maxWidth: "90%" },
});
