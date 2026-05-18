import React, { useCallback } from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";

import { useStreamdownMarkdown } from "@/hooks/useStreamdownMarkdown";
import { useTheme } from "@/hooks/useTheme";
import { markdownStyleFor } from "@/theme/markdownStyles";

export interface MarkdownMessageProps {
  markdown: string;
  isStreaming?: boolean;
}

export function MarkdownMessage({
  markdown,
  isStreaming: isGenerating = false,
}: MarkdownMessageProps) {
  const { colors } = useTheme();
  const markdownStyle = markdownStyleFor(colors);
  const { processedMarkdown, isStreaming: isProcessing } =
    useStreamdownMarkdown(markdown);
  const isStreaming = isGenerating || isProcessing;

  const handleLinkPress = useCallback((event: { url: string }) => {
    const { url } = event;
    Alert.alert("Open link?", url, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open",
        onPress: () => {
          void Linking.openURL(url).catch(() => undefined);
        },
      },
    ]);
  }, []);

  if (!markdown && !isGenerating) {
    return null;
  }

  return (
    <View style={styles.container}>
      <EnrichedMarkdownText
        flavor="github"
        markdown={processedMarkdown}
        md4cFlags={{ latexMath: true }}
        streamingAnimation={isStreaming}
        selectable={!isStreaming}
        markdownStyle={markdownStyle}
        containerStyle={styles.markdownContainer}
        onLinkPress={handleLinkPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
  },
  markdownContainer: {
    width: "100%",
  },
});
