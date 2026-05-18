import type { RemendOptions } from "remend";
import remend from "remend";

/** Inline math only — block $$ is converted away before render. */
export const STREAMDOWN_REMEND_CONFIG: RemendOptions = {
  bold: true,
  italic: true,
  boldItalic: true,
  strikethrough: true,
  links: true,
  linkMode: "text-only",
  images: true,
  inlineCode: true,
  katex: false,
  inlineKatex: true,
  setextHeadings: true,
};

/**
 * Turn $$...$$ (including multiline) into one $...$ per line so the native
 * renderer only ever sees inline math.
 */
export function convertBlockMathToInline(markdown: string): string {
  let result = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
    const body = inner.trim();
    if (!body) return "";

    // Only split on real newlines — never on "\\" (that breaks \\int, \\frac, etc.)
    const lines = body
      .split(/\n+/)
      .map((line: string) => line.trim())
      .filter(Boolean);

    return lines
      .map(
        (line: string) =>
          `$${collapseLatexBackslashes(line.replace(/\s+/g, " "))}$`,
      )
      .join("\n\n");
  });

  result = finalizePartialBlockMath(result);
  result = result.replace(/^\s*\$\$\s*$/gm, "");
  return result;
}

/** Streaming may end with an unclosed $$ block — render it as inline math. */
export function finalizePartialBlockMath(markdown: string): string {
  const lastOpen = markdown.lastIndexOf("$$");
  if (lastOpen === -1) return markdown;

  const tail = markdown.slice(lastOpen + 2);
  if (tail.includes("$$")) return markdown;

  const head = markdown.slice(0, lastOpen).trimEnd();
  const inner = tail.trim();
  if (!inner) return head;

  const line = `$${collapseLatexBackslashes(inner.replace(/\s+/g, " "))}$`;
  return head ? `${head}\n\n${line}` : line;
}

/**
 * Collapse runs of 2+ backslashes to one inside math.
 * e.g. \\\\int (4 chars) must become \int, not \\int.
 */
export function collapseLatexBackslashes(math: string): string {
  let result = math;
  let previous = "";
  while (previous !== result) {
    previous = result;
    result = result.replace(/\\{2,}/g, "\\");
  }
  return result;
}

/** Normalize over-escaped LaTeX inside $...$ spans. */
export function normalizeLatexEscapes(markdown: string): string {
  return markdown.replace(
    /(?<!\$)\$(?!\$)([^$\n]+)\$(?!\$)/g,
    (_, math) => `$${collapseLatexBackslashes(math)}$`,
  );
}

export function prepareMarkdownForRender(
  markdown: string,
  remendConfig: RemendOptions = STREAMDOWN_REMEND_CONFIG,
): string {
  if (!markdown) return "";
  let result = remend(markdown, remendConfig);
  result = convertBlockMathToInline(result);
  result = normalizeLatexEscapes(result);
  return result;
}
