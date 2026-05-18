import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThreadWithPreview } from "@/db/repositories/threadsRepo";
import { useTheme } from "@/hooks/useTheme";
import { useThreads } from "@/hooks/useThreads";
import { Radius, Spacing, Typography } from "@/theme";

import { Button } from "@/components/common/Button";
import { Divider } from "@/components/common/Divider";
import {
  CloseIcon,
  NewChatIcon,
  SearchIcon,
  SettingsIcon,
} from "@/components/common/Icons";
import { LoadingState } from "@/components/common/LoadingState";
import { TextInput } from "@/components/common/TextInput";
import { ThreadListItem } from "./ThreadListItem";

const ANIM_DURATION = 220;
const DRAWER_RATIO = 0.84;
const DRAWER_MAX_WIDTH = 360;

export interface ThreadDrawerProps {
  visible: boolean;
  activeThreadId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNewChat: () => Promise<string | null>;
}

interface SectionItem {
  type: "pinned-header" | "regular-header" | "thread";
  thread?: ThreadWithPreview;
  label?: string;
}

export function ThreadDrawer({
  visible,
  activeThreadId,
  onClose,
  onSelect,
  onNewChat,
}: ThreadDrawerProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    threads,
    loading,
    search,
    setSearch,
    refresh,
    togglePinned,
    deleteThread,
  } = useThreads();

  const screenWidth = Dimensions.get("window").width;
  const drawerWidth = Math.min(
    DRAWER_MAX_WIDTH,
    Math.round(screenWidth * DRAWER_RATIO),
  );

  const [mounted, setMounted] = useState(visible);
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -drawerWidth,
          duration: ANIM_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [backdropOpacity, drawerWidth, mounted, translateX, visible]);

  useEffect(() => {
    if (visible) void refresh();
  }, [refresh, visible]);

  const items = useMemo<SectionItem[]>(() => {
    const pinned = threads.filter((t) => t.pinned);
    const regular = threads.filter((t) => !t.pinned);
    const list: SectionItem[] = [];
    if (pinned.length > 0) {
      list.push({ type: "pinned-header", label: "Pinned" });
      for (const t of pinned) list.push({ type: "thread", thread: t });
    }
    if (regular.length > 0) {
      list.push({ type: "regular-header", label: "All chats" });
      for (const t of regular) list.push({ type: "thread", thread: t });
    }
    return list;
  }, [threads]);

  const renderItem = ({ item }: ListRenderItemInfo<SectionItem>) => {
    if (item.type !== "thread") {
      return (
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
          {item.label}
        </Text>
      );
    }
    const t = item.thread!;
    return (
      <ThreadListItem
        thread={t}
        active={t.id === activeThreadId}
        onPress={(id) => {
          onSelect(id);
          onClose();
        }}
        onTogglePin={(id, pinned) => void togglePinned(id, pinned)}
        onDelete={(id) => {
          Alert.alert(
            "Delete chat",
            "This will permanently remove the chat and its messages.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => void deleteThread(id),
              },
            ],
          );
        }}
      />
    );
  };

  const keyExtractor = (item: SectionItem, index: number) =>
    item.type === "thread" ? item.thread!.id : `${item.type}-${index}`;

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        style={[
          styles.backdrop,
          { backgroundColor: colors.backdrop, opacity: backdropOpacity },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        style={[
          styles.drawer,
          {
            backgroundColor: colors.background,
            borderRightColor: colors.border,
            width: drawerWidth,
            transform: [{ translateX }],
          },
        ]}>
        <SafeAreaView edges={["top", "left", "bottom"]} style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Chats
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              hitSlop={8}
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.surfaceMuted },
              ]}>
              <CloseIcon size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchIconBox,
                { backgroundColor: colors.surfaceMuted },
              ]}>
              <SearchIcon size={16} color={colors.textMuted} />
            </View>
            <TextInput
              variant="flat"
              containerStyle={{ flex: 1, minHeight: 40, paddingVertical: 0 }}
              placeholder="Search chats"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.actionsRow}>
            <Button
              title="New chat"
              size="md"
              variant="primary"
              leadingIcon={<NewChatIcon size={16} color={colors.primaryText} />}
              onPress={async () => {
                const id = await onNewChat();
                if (id) {
                  onSelect(id);
                  onClose();
                }
              }}
              style={{ flex: 1 }}
            />
          </View>

          <Divider style={{ marginVertical: Spacing.sm }} />

          {loading && items.length === 0 ? (
            <LoadingState label="Loading chats…" />
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No chats yet
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
                Tap “New chat” to start a private conversation.
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={{ paddingBottom: Spacing.lg }}
            />
          )}

          <Divider style={{ marginVertical: Spacing.xs }} />
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              onPress={() => {
                onClose();
                router.push("/settings");
              }}
              style={({ pressed }) => [
                styles.footerRow,
                { backgroundColor: pressed ? colors.surface : "transparent" },
              ]}>
              <SettingsIcon size={18} color={colors.text} />
              <Text style={[styles.footerText, { color: colors.text }]}>
                Settings
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  searchIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  sectionHeader: {
    fontSize: Typography.size.xs,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
  },
  emptyBody: {
    marginTop: Spacing.xs,
    textAlign: "center",
    maxWidth: 260,
    fontSize: Typography.size.sm,
  },
  footer: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  footerText: { fontSize: Typography.size.md },
});
