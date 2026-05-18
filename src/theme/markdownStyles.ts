import type { MarkdownStyle } from "react-native-enriched-markdown";

import type { ThemeColors } from "./colors";
import { Spacing } from "./spacing";
import { Typography } from "./typography";

export function markdownStyleFor(colors: ThemeColors): MarkdownStyle {
  const body = {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.sans,
    color: colors.bubbleAssistantText,
    lineHeight: Typography.size.md * Typography.lineHeight.relaxed,
    marginTop: 0,
    marginBottom: Spacing.sm,
  };

  const heading = (fontSize: number) => ({
    ...body,
    fontSize,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  });

  return {
    paragraph: body,
    h1: heading(Typography.size.title),
    h2: heading(Typography.size.xxl),
    h3: heading(Typography.size.xl),
    h4: heading(Typography.size.lg),
    h5: heading(Typography.size.md),
    h6: heading(Typography.size.sm),
    blockquote: {
      ...body,
      borderColor: colors.border,
      borderWidth: 3,
      gapWidth: Spacing.md,
      backgroundColor: colors.surfaceMuted,
    },
    list: {
      ...body,
      bulletColor: colors.bubbleAssistantText,
      markerColor: colors.bubbleAssistantText,
      gapWidth: Spacing.sm,
      marginLeft: Spacing.md,
    },
    code: {
      fontFamily: Typography.family.mono,
      fontSize: Typography.size.sm,
      color: colors.bubbleAssistantText,
      backgroundColor: colors.surfaceMuted,
    },
    codeBlock: {
      ...body,
      fontFamily: Typography.family.mono,
      fontSize: Typography.size.sm,
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: Spacing.md,
    },
    link: {
      color: colors.accent,
      underline: true,
    },
    strong: {
      fontWeight: "bold",
      color: colors.bubbleAssistantText,
    },
    em: {
      fontStyle: "italic",
      color: colors.bubbleAssistantText,
    },
    thematicBreak: {
      color: colors.border,
      height: 1,
      marginTop: Spacing.md,
      marginBottom: Spacing.md,
    },
    table: {
      ...body,
      fontSize: Typography.size.sm,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      headerBackgroundColor: colors.surfaceMuted,
      headerTextColor: colors.bubbleAssistantText,
      rowEvenBackgroundColor: colors.surface,
      rowOddBackgroundColor: colors.surfaceElevated,
      cellPaddingHorizontal: Spacing.md,
      cellPaddingVertical: Spacing.sm,
    },
    math: {
      fontSize: Typography.size.md,
      color: colors.bubbleAssistantText,
      backgroundColor: colors.surfaceMuted,
      padding: Spacing.sm,
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
      textAlign: "center",
    },
    inlineMath: {
      color: colors.bubbleAssistantText,
    },
  };
}
