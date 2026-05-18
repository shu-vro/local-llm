import { useEffect, useRef, useState } from "react";
import type { RemendOptions } from "remend";
import remend from "remend";

const defaultRemendConfig: RemendOptions = {
  bold: true,
  italic: true,
  boldItalic: true,
  strikethrough: true,
  links: true,
  linkMode: "text-only",
  images: true,
  inlineCode: true,
  katex: true,
  setextHeadings: true,
};

interface UseStreamdownMarkdownOptions {
  remendConfig?: RemendOptions;
}

interface UseStreamdownMarkdownResult {
  processedMarkdown: string;
  isStreaming: boolean;
}

export function useStreamdownMarkdown(
  markdown: string,
  options?: UseStreamdownMarkdownOptions,
): UseStreamdownMarkdownResult {
  const [processedMarkdown, setProcessedMarkdown] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const versionRef = useRef(0);

  const remendConfig = options?.remendConfig ?? defaultRemendConfig;

  useEffect(() => {
    if (markdown === "") {
      setProcessedMarkdown("");
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    const currentVersion = ++versionRef.current;

    const frame = requestAnimationFrame(() => {
      const result = remend(markdown, remendConfig);
      if (currentVersion === versionRef.current) {
        setProcessedMarkdown(result);
        setIsStreaming(false);
      }
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [markdown, remendConfig]);

  return { processedMarkdown, isStreaming };
}
