import React, { useMemo } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/common/BottomSheet";
import { CameraIcon, DocIcon, ImageIcon } from "@/components/common/Icons";
import { useTheme } from "@/hooks/useTheme";
import { Radius, Spacing, Typography } from "@/theme";

/** Matches BottomSheet detached margins + content padding. */
const SHEET_MARGIN = Spacing.lg;
const SHEET_PADDING = Spacing.lg;
const OPTION_GAP = Spacing.sm;

export interface AttachmentPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onTakePhoto: () => void;
  onPickDocument: () => void;
}

interface AttachOptionProps {
  label: string;
  size: number;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
  backgroundColor: string;
  iconColor: string;
  labelColor: string;
}

function AttachOption({
  label,
  size,
  icon: Icon,
  onPress,
  backgroundColor,
  iconColor,
  labelColor,
}: AttachOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          width: size,
          height: size,
          backgroundColor,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Icon size={28} color={iconColor} />
      <Text
        style={[styles.optionLabel, { color: labelColor }]}
        numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AttachmentPickerSheet({
  visible,
  onClose,
  onPickImage,
  onTakePhoto,
  onPickDocument,
}: AttachmentPickerSheetProps) {
  const { colors } = useTheme();

  const optionSize = useMemo(() => {
    const windowWidth = Dimensions.get("window").width;
    const rowWidth =
      windowWidth - SHEET_MARGIN * 2 - SHEET_PADDING * 2 - OPTION_GAP * 2;
    return Math.floor(rowWidth / 3);
  }, []);

  const run = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      scrollable={false}
      contentStyle={styles.sheetContent}>
      <View style={styles.row}>
        <AttachOption
          label="Photo library"
          size={optionSize}
          icon={ImageIcon}
          onPress={() => run(onPickImage)}
          backgroundColor={colors.surfaceMuted}
          iconColor={colors.text}
          labelColor={colors.textMuted}
        />
        <AttachOption
          label="Take photo"
          size={optionSize}
          icon={CameraIcon}
          onPress={() => run(onTakePhoto)}
          backgroundColor={colors.surfaceMuted}
          iconColor={colors.text}
          labelColor={colors.textMuted}
        />
        <AttachOption
          label="Files"
          size={optionSize}
          icon={DocIcon}
          onPress={() => run(onPickDocument)}
          backgroundColor={colors.surfaceMuted}
          iconColor={colors.text}
          labelColor={colors.textMuted}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    gap: 0,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: OPTION_GAP,
  },
  option: {
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  optionLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    textAlign: "center",
  },
});
