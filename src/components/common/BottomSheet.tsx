import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
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
  /** Use BottomSheetView instead of ScrollView (better for fixed-height content). */
  scrollable?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  contentStyle,
  scrollable = true,
}: BottomSheetProps) {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const wasVisibleRef = useRef(false);
  const bottomInset = insets.bottom + SHEET_MARGIN;

  const maxDynamicContentSize = useMemo(() => {
    const screenHeight = Dimensions.get("window").height;
    return screenHeight - insets.top - bottomInset - SHEET_MARGIN;
  }, [bottomInset, insets.top]);

  useEffect(() => {
    if (visible) {
      const frame = requestAnimationFrame(() => {
        ref.current?.present();
      });
      wasVisibleRef.current = true;
      return () => cancelAnimationFrame(frame);
    }
    if (wasVisibleRef.current) {
      ref.current?.dismiss();
      wasVisibleRef.current = false;
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    wasVisibleRef.current = false;
    onClose();
  }, [onClose]);

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
      onDismiss={handleDismiss}
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
      {scrollable ? (
        <BottomSheetScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled">
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={[styles.content, contentStyle]}>
          {children}
        </BottomSheetView>
      )}
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
