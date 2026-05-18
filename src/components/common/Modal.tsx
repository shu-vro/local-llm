import React from "react";
import {
  Pressable,
  Modal as RNModal,
  ModalProps as RNModalProps,
  StyleSheet,
  ViewStyle,
} from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Radius, Spacing } from "@/theme";

export interface ModalProps extends Omit<RNModalProps, "children"> {
  visible: boolean;
  onClose: () => void;
  align?: "center" | "bottom";
  contentStyle?: ViewStyle;
  children: React.ReactNode;
  dismissOnBackdrop?: boolean;
}

export function Modal({
  visible,
  onClose,
  align = "center",
  contentStyle,
  children,
  dismissOnBackdrop = true,
  ...rest
}: ModalProps) {
  const { colors } = useTheme();
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      {...rest}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close modal"
        onPress={dismissOnBackdrop ? onClose : undefined}
        style={[
          styles.backdrop,
          { backgroundColor: colors.backdrop },
          align === "bottom" ? styles.bottom : styles.center,
        ]}>
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              borderRadius: align === "bottom" ? Radius.xl : Radius.lg,
            },
            contentStyle,
          ]}>
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, padding: Spacing.lg },
  center: { alignItems: "center", justifyContent: "center" },
  bottom: { justifyContent: "flex-end" },
  sheet: {
    width: "100%",
    maxWidth: 480,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
  },
});
