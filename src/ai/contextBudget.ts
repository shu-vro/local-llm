import { Attachment } from "@/db/repositories/attachmentsRepo";
import { Message } from "@/db/repositories/messagesRepo";

/** Rough token estimate (~4 chars per token). Good enough for budgeting UI. */
export function estimateTextTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

const IMAGE_TOKEN_COST = 256;
const SYSTEM_PROMPT_RESERVE = 512;
const GENERATION_RESERVE = 256;

export const DEFAULT_MAX_CONTEXT_TOKENS = 8192;

export interface ContextBudgetResult {
  messages: Message[];
  estimatedTokens: number;
  trimmedCount: number;
}

function messageTokenCost(msg: Message, attachments: Attachment[]): number {
  let cost = estimateTextTokens(msg.content);
  if (msg.role === "user") {
    const images = attachments.filter((a) => a.kind === "image");
    cost += images.length * IMAGE_TOKEN_COST;
  }
  return cost;
}

export function estimateHistoryTokens(
  history: Message[],
  attachmentsByMessage: Map<string, Attachment[]>,
  systemPromptChars = 0,
): number {
  let total =
    estimateTextTokens(" ".repeat(systemPromptChars)) + SYSTEM_PROMPT_RESERVE;
  for (const msg of history) {
    if (msg.role === "system") continue;
    const atts = attachmentsByMessage.get(msg.id) ?? [];
    total += messageTokenCost(msg, atts);
  }
  return total;
}

/**
 * Drop oldest non-system messages until the prompt fits under maxContextTokens,
 * keeping at least the latest user turn when possible.
 */
export function trimHistoryForContext(
  history: Message[],
  attachmentsByMessage: Map<string, Attachment[]>,
  maxContextTokens: number,
): ContextBudgetResult {
  const budget = Math.max(
    1024,
    maxContextTokens - SYSTEM_PROMPT_RESERVE - GENERATION_RESERVE,
  );
  let working = [...history];
  let trimmedCount = 0;

  const estimate = () => estimateHistoryTokens(working, attachmentsByMessage);

  while (working.length > 2 && estimate() > budget) {
    const dropIdx = working.findIndex((m) => m.role !== "system");
    if (dropIdx < 0) break;
    working = working.filter((_, i) => i !== dropIdx);
    trimmedCount += 1;
  }

  return {
    messages: working,
    estimatedTokens: estimate(),
    trimmedCount,
  };
}

export function contextUsageRatio(used: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(1, used / max));
}
