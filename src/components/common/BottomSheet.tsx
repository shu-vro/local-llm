import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Dimensions, StyleSheet, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { Radius, Spacing } from "@/theme";

/** Gap between sheet edges and screen (matches legacy Modal backdrop padding). */
const SHEET_MARGIN = Spacing.lg;

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  contentStyle,
}: BottomSheetProps) {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const bottomInset = insets.bottom + SHEET_MARGIN;

  const maxDynamicContentSize = useMemo(() => {
    const screenHeight = Dimensions.get("window").height;
    return screenHeight - insets.top - bottomInset - SHEET_MARGIN;
  }, [bottomInset, insets.top]);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.45}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      key={theme}
      ref={ref}
      index={0}
      detached
      enableDynamicSizing
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      bottomInset={20}
      style={styles.detachedSheet}
      backgroundStyle={[
        styles.sheet,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
      handleIndicatorStyle={{ backgroundColor: colors.textMuted, width: 36 }}
      maxDynamicContentSize={maxDynamicContentSize}>
      <BottomSheetScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled">
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  detachedSheet: {
    marginHorizontal: SHEET_MARGIN,
    marginBottom: SHEET_MARGIN,
  },
  sheet: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
});
