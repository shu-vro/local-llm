import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

export interface StreamingCursorProps {
  visible: boolean;
  size?: number;
}

export function StreamingCursor({ visible, size = 8 }: StreamingCursorProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 380,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [opacity, visible]);

  if (!visible) return null;

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.text,
          opacity,
          marginLeft: 2,
        }}
      />
    </View>
  );
}
