import type { CactusLMMessage } from "cactus-react-native";

import { resolveInferenceImagePath } from "@/ai/imageAttachments";
import { Attachment } from "@/db/repositories/attachmentsRepo";
import { Message } from "@/db/repositories/messagesRepo";

export const SYSTEM_PROMPT =
  "You are a private local AI assistant running fully on this device. Be helpful, concise, and honest. If a file or modality is unsupported, say so clearly. Do not claim to have internet access. Do not claim to have uploaded or downloaded anything except the local model if asked.";

export const TITLE_SYSTEM_PROMPT =
  "You write very short conversation titles. Respond with a 3 to 6 word title that summarizes the main topic. Use Title Case. Do not include quotes, emojis, punctuation, or trailing text. Reply with the title only.";

function summarizeAttachment(
  att: Attachment,
  options?: { forInference?: boolean; fileMissing?: boolean },
): string {
  const name = att.filename ?? att.id;
  const size = att.sizeBytes
    ? `${Math.round(att.sizeBytes / 1024)} KB`
    : "unknown size";
  const mime = att.mimeType ?? "unknown type";
  switch (att.kind) {
    case "image":
      if (options?.fileMissing) {
        return `[Image was shared earlier: ${name} (${mime}, ${size}). The file is no longer on disk.]`;
      }
      if (options?.forInference) {
        return `[Image attached: ${name} (${mime}, ${size}). The model can see this image.]`;
      }
      return `[Image shared earlier in this chat: ${name} (${mime}, ${size}).]`;
    case "audio":
      return `[Attachment stored locally but not processed: ${name}, ${mime}. Audio understanding is disabled in this build.]`;
    case "video":
      return `[Attachment stored locally but not processed: ${name}, ${mime}. Video understanding is not supported in this build.]`;
    case "pdf":
      return att.extractedText
        ? `[PDF attached: ${name}. Extracted text below.]\n${att.extractedText}`
        : `[Attachment stored locally but not processed: ${name}, ${mime}. PDF text extraction is not available in this local build.]`;
    case "document":
      return att.extractedText
        ? `[Document attached: ${name}. Extracted text below.]\n${att.extractedText}`
        : `[Attachment stored locally but not processed: ${name}, ${mime}. Document text extraction is not available in this local build.]`;
    case "other":
    default:
      return `[Attachment stored locally but not processed: ${name}, ${mime}. Modality not supported in this build.]`;
  }
}

export interface BuildPromptParams {
  history: Message[];
  attachmentsByMessage: Map<string, Attachment[]>;
  ragChunks?: { source: string; content: string; score: number }[];
}

export interface BuiltPrompt {
  messages: CactusLMMessage[];
  imagePaths: string[];
}

export function buildChatPrompt({
  history,
  attachmentsByMessage,
  ragChunks,
}: BuildPromptParams): BuiltPrompt {
  const messages: CactusLMMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (ragChunks && ragChunks.length > 0) {
    const blob = ragChunks
      .map((c, idx) => `[#${idx + 1} from ${c.source}]\n${c.content}`)
      .join("\n\n");
    messages.push({
      role: "system",
      content: `Local knowledge retrieved from your saved notes:\n${blob}\n\nUse this only if it is relevant.`,
    });
  }

  const lastUserMessage = [...history].reverse().find((m) => m.role === "user");
  const visionMessageId = lastUserMessage?.id ?? null;

  const collectedImages: string[] = [];
  for (const msg of history) {
    if (msg.role === "system") continue;
    const atts = attachmentsByMessage.get(msg.id) ?? [];
    const textParts: string[] = [];
    if (msg.content) textParts.push(msg.content);
    const imagePaths: string[] = [];
    const attachBinaryImages =
      msg.role === "user" && msg.id === visionMessageId;
    for (const att of atts) {
      if (attachBinaryImages && att.kind === "image") {
        const path = resolveInferenceImagePath(att);
        if (path) {
          imagePaths.push(path);
          collectedImages.push(path);
          textParts.push(summarizeAttachment(att, { forInference: true }));
          continue;
        }
        textParts.push(summarizeAttachment(att, { fileMissing: true }));
        continue;
      }
      textParts.push(summarizeAttachment(att));
    }
    const next: CactusLMMessage = {
      role: msg.role,
      content: textParts.join("\n\n").trim(),
    };
    if (imagePaths.length > 0 && msg.role === "user") {
      next.images = imagePaths;
    }
    if (!next.content && !next.images?.length) continue;
    messages.push(next);
  }

  return { messages, imagePaths: collectedImages };
}

export function buildTitlePrompt(firstUserMessage: string): CactusLMMessage[] {
  const trimmed = firstUserMessage.trim().slice(0, 600);
  return [
    { role: "system", content: TITLE_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Conversation start:\n"""\n${trimmed}\n"""\nTitle:`,
    },
  ];
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "is",
  "are",
  "was",
  "were",
  "be",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "at",
  "by",
  "from",
  "as",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "me",
  "my",
  "we",
  "our",
  "it",
  "its",
  "do",
  "does",
  "did",
  "can",
  "could",
  "would",
  "should",
  "will",
]);

export function fallbackTitle(firstUserMessage: string): string {
  const clean = firstUserMessage.replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  const tokens = clean.split(/\s+/);
  const significant: string[] = [];
  for (const tok of tokens) {
    const raw = tok.replace(/[^\p{L}\p{N}'-]/gu, "");
    if (!raw) continue;
    if (significant.length < 2 || !STOPWORDS.has(raw.toLowerCase())) {
      significant.push(raw);
    }
    if (significant.length >= 6) break;
  }
  if (significant.length === 0) return clean.slice(0, 40);
  const titled = significant
    .map((w) => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
  return titled.length > 60 ? `${titled.slice(0, 57)}…` : titled;
}

export function sanitizeTitle(raw: string): string {
  const stripped = raw
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return "New chat";
  return stripped.length > 60 ? `${stripped.slice(0, 57)}…` : stripped;
}
