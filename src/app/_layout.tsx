import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useTheme } from "@/hooks/useTheme";
import { CactusProvider } from "@/providers/CactusProvider";
import { DatabaseProvider } from "@/providers/DatabaseProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";

function ThemedRoot({ children }: { children: React.ReactNode }) {
  const { theme, colors } = useTheme();
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).catch(
      () => undefined,
    );
  }, [colors.background]);
  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      />
      {children}
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary fallbackTitle="The app crashed unexpectedly">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <DatabaseProvider>
            <ThemeProvider>
              <BottomSheetModalProvider>
                <CactusProvider>
                  <ThemedRoot>{null}</ThemedRoot>
                </CactusProvider>
              </BottomSheetModalProvider>
            </ThemeProvider>
          </DatabaseProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
