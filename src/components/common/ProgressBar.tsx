import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Radius } from "@/theme";

export interface ProgressBarProps {
  progress: number;
  height?: number;
  style?: ViewStyle;
  indeterminate?: boolean;
}

export function ProgressBar({
  progress,
  height = 6,
  style,
  indeterminate,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const clamped = Math.max(
    0,
    Math.min(1, Number.isFinite(progress) ? progress : 0),
  );
  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: colors.surfaceMuted,
          height,
          borderRadius: Radius.pill,
        },
        style,
      ]}>
      <View
        style={{
          width: indeterminate ? "40%" : `${clamped * 100}%`,
          height: "100%",
          backgroundColor: colors.accent,
          borderRadius: Radius.pill,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", overflow: "hidden" },
});
