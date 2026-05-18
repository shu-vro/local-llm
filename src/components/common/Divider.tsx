import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";

export interface DividerProps {
  style?: ViewStyle;
  inset?: number;
}

export function Divider({ style, inset = 0 }: DividerProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.line,
        {
          backgroundColor: colors.divider,
          marginLeft: inset,
          marginRight: inset,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, alignSelf: "stretch" },
});
