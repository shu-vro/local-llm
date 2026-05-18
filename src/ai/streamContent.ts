/** Prefer the longest snapshot so UI/DB never lose streamed tokens. */
export function pickLongestStreamContent(
  ...candidates: (string | null | undefined)[]
): string {
  let best = "";
  for (const c of candidates) {
    if (c && c.length > best.length) best = c;
  }
  return best;
}

export function hitMaxTokenLimit(
  decodeTokens: number | undefined,
  maxTokens: number,
): boolean {
  if (!decodeTokens || !maxTokens) return false;
  return decodeTokens >= maxTokens - 1;
}
