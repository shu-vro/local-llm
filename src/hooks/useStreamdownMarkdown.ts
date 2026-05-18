import { useMemo } from "react";
import type { RemendOptions } from "remend";

import {
  prepareMarkdownForRender,
  STREAMDOWN_REMEND_CONFIG,
} from "@/utils/markdownMath";

interface UseStreamdownMarkdownOptions {
  remendConfig?: RemendOptions;
}

interface UseStreamdownMarkdownResult {
  displayMarkdown: string;
  isProcessing: boolean;
}

/**
 * Applies remend on every update (including streaming), like react-native-streamdown.
 * @see https://github.com/software-mansion-labs/react-native-streamdown
 */
export function useStreamdownMarkdown(
  markdown: string,
  options?: UseStreamdownMarkdownOptions,
): UseStreamdownMarkdownResult {
  const remendConfig = options?.remendConfig ?? STREAMDOWN_REMEND_CONFIG;

  const displayMarkdown = useMemo(
    () => prepareMarkdownForRender(markdown, remendConfig),
    [markdown, remendConfig],
  );

  return { displayMarkdown, isProcessing: false };
}
