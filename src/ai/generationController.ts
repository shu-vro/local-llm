import { Repositories } from "@/db/repositories";
import { Attachment } from "@/db/repositories/attachmentsRepo";
import { Message, MessagesRepo } from "@/db/repositories/messagesRepo";
import { AppSettings } from "@/db/repositories/settingsRepo";
import { Thread } from "@/db/repositories/threadsRepo";

import { PreparedAttachment } from "./attachmentPipeline";
import { CactusClient } from "./cactusClient";
import {
  estimateHistoryTokens,
  estimateTextTokens,
  trimHistoryForContext,
} from "./contextBudget";
import {
  buildChatPrompt,
  buildTitlePrompt,
  fallbackTitle,
  sanitizeTitle,
  SYSTEM_PROMPT,
} from "./promptBuilder";
import { ragQuery } from "./rag";

const PERSIST_FLUSH_MS = 80;
const TITLE_MAX_TOKENS = 24;

export interface GenerationMetrics {
  tokensPerSecond?: number;
  contextTokensUsed?: number;
  contextTokensMax?: number;
  contextTrimmed?: boolean;
}

export interface GenerationEvent {
  type:
    | "user-created"
    | "assistant-created"
    | "token"
    | "metrics"
    | "completed"
    | "cancelled"
    | "failed"
    | "title";
  threadId: string;
  messageId?: string;
  message?: Message;
  delta?: string;
  error?: string;
  title?: string;
  metrics?: GenerationMetrics;
}

export type GenerationListener = (event: GenerationEvent) => void;

export interface StartGenerationParams {
  threadId: string;
  userContent: string;
  attachments?: PreparedAttachment[];
  settings: AppSettings;
  enableRag?: boolean;
}

export interface RegenerateParams {
  threadId: string;
  fromAssistantMessageId: string;
  settings: AppSettings;
  enableRag?: boolean;
}

export interface EditUserAndRegenerateParams {
  threadId: string;
  userMessageId: string;
  newContent: string;
  settings: AppSettings;
  enableRag?: boolean;
}

export class GenerationController {
  private running: {
    threadId: string;
    assistantMessageId: string;
    abort: AbortController;
  } | null = null;
  private listeners = new Set<GenerationListener>();

  constructor(
    private readonly repos: Repositories,
    private readonly client: CactusClient,
  ) {}

  addListener(listener: GenerationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(ev: GenerationEvent): void {
    for (const l of Array.from(this.listeners)) {
      try {
        l(ev);
      } catch (err) {
        if (__DEV__)
          console.warn("[GenerationController] listener threw:", err);
      }
    }
  }

  get isGenerating(): boolean {
    return this.running !== null;
  }

  get activeThreadId(): string | null {
    return this.running?.threadId ?? null;
  }

  get activeMessageId(): string | null {
    return this.running?.assistantMessageId ?? null;
  }

  async start(params: StartGenerationParams): Promise<void> {
    if (this.running) {
      throw new Error("A generation is already in progress.");
    }
    const {
      threadId,
      userContent,
      attachments = [],
      settings,
      enableRag,
    } = params;

    const userMsg = await this.repos.messages.create({
      threadId,
      role: "user",
      content: userContent,
      status: "complete",
    });
    for (const att of attachments) {
      await this.repos.attachments.create({
        id: att.id,
        threadId,
        messageId: userMsg.id,
        kind: att.kind,
        mimeType: att.mimeType,
        filename: att.filename,
        localUri: att.localUri,
        sizeBytes: att.sizeBytes,
        processingStatus: att.processingStatus,
        metadata: att.unsupportedReason
          ? { unsupportedReason: att.unsupportedReason }
          : {},
      });
    }
    this.emit({
      type: "user-created",
      threadId,
      messageId: userMsg.id,
      message: userMsg,
    });
    await this.repos.threads.touch(threadId);

    const assistantMsg = await this.repos.messages.create({
      threadId,
      role: "assistant",
      content: "",
      status: "streaming",
      parentMessageId: userMsg.id,
    });
    this.emit({
      type: "assistant-created",
      threadId,
      messageId: assistantMsg.id,
      message: assistantMsg,
    });

    await this.runStreaming(threadId, assistantMsg.id, settings, enableRag);
  }

  async regenerate(params: RegenerateParams): Promise<void> {
    if (this.running) throw new Error("A generation is already in progress.");
    const { threadId, fromAssistantMessageId, settings, enableRag } = params;
    const target = await this.repos.messages.getById(fromAssistantMessageId);
    if (!target || target.role !== "assistant") {
      throw new Error("Cannot regenerate: assistant message not found.");
    }
    await this.repos.messages.deleteAfter(threadId, target.createdAt, true);
    const assistantMsg = await this.repos.messages.create({
      threadId,
      role: "assistant",
      content: "",
      status: "streaming",
      parentMessageId: target.parentMessageId,
    });
    this.emit({
      type: "assistant-created",
      threadId,
      messageId: assistantMsg.id,
      message: assistantMsg,
    });

    await this.runStreaming(threadId, assistantMsg.id, settings, enableRag);
  }

  async editUserAndRegenerate(
    params: EditUserAndRegenerateParams,
  ): Promise<void> {
    if (this.running) throw new Error("A generation is already in progress.");
    const { threadId, userMessageId, newContent, settings, enableRag } = params;
    const userMsg = await this.repos.messages.getById(userMessageId);
    if (!userMsg || userMsg.role !== "user") {
      throw new Error("Cannot edit: user message not found.");
    }
    await this.repos.messages.finalize(userMessageId, "complete", {
      content: newContent,
    });
    await this.repos.messages.deleteAfter(threadId, userMsg.createdAt, false);

    const assistantMsg = await this.repos.messages.create({
      threadId,
      role: "assistant",
      content: "",
      status: "streaming",
      parentMessageId: userMessageId,
    });
    this.emit({
      type: "assistant-created",
      threadId,
      messageId: assistantMsg.id,
      message: assistantMsg,
    });

    await this.runStreaming(threadId, assistantMsg.id, settings, enableRag);
  }

  async cancel(): Promise<void> {
    if (!this.running) return;
    const ref = this.running;
    ref.abort.abort();
    try {
      await this.client.stop();
    } catch {
      // best-effort
    }
    await this.repos.messages.finalize(ref.assistantMessageId, "cancelled");
    this.emit({
      type: "cancelled",
      threadId: ref.threadId,
      messageId: ref.assistantMessageId,
    });
    this.running = null;
  }

  private async runStreaming(
    threadId: string,
    assistantMessageId: string,
    settings: AppSettings,
    enableRag?: boolean,
  ): Promise<void> {
    const abort = new AbortController();
    this.running = { threadId, assistantMessageId, abort };

    let buffer = "";
    let pending = "";
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let flushInFlight: Promise<void> = Promise.resolve();

    const flush = (force = false) => {
      if (!pending && !force) return;
      const chunk = pending;
      pending = "";
      const op = (async () => {
        await flushInFlight;
        await this.repos.messages.appendStreaming(assistantMessageId, chunk);
      })().catch((err) => {
        if (__DEV__)
          console.warn(
            "[GenerationController] persist stream chunk failed:",
            err,
          );
      });
      flushInFlight = op;
    };

    const scheduleFlush = () => {
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flush();
      }, PERSIST_FLUSH_MS);
    };

    try {
      const history = await this.repos.messages.listRecentContext(
        threadId,
        settings.contextMessageLimit,
      );
      const histExcludingPlaceholder = history.filter(
        (m) => m.id !== assistantMessageId,
      );

      const attachmentsForMessages = await loadAttachmentsForMessages(
        this.repos,
        histExcludingPlaceholder,
      );

      const trimmed = trimHistoryForContext(
        histExcludingPlaceholder,
        attachmentsForMessages,
        settings.maxContextTokens,
      );
      const promptHistory = trimmed.messages;

      let ragChunks: { source: string; content: string; score: number }[] = [];
      if (enableRag) {
        const lastUserMsg = [...promptHistory]
          .reverse()
          .find((m) => m.role === "user");
        if (lastUserMsg?.content) {
          ragChunks = await ragQuery(this.client, lastUserMsg.content, 4);
        }
      }

      const built = buildChatPrompt({
        history: promptHistory,
        attachmentsByMessage: attachmentsForMessages,
        ragChunks,
      });

      const contextTokensUsed = estimateHistoryTokens(
        promptHistory,
        attachmentsForMessages,
        SYSTEM_PROMPT.length,
      );
      const contextTokensMax = settings.maxContextTokens;
      this.emit({
        type: "metrics",
        threadId,
        messageId: assistantMessageId,
        metrics: {
          contextTokensUsed,
          contextTokensMax,
          contextTrimmed: trimmed.trimmedCount > 0,
        },
      });

      let streamTokenEstimate = 0;
      let streamStartedAt: number | null = null;

      const result = await this.client.complete({
        messages: built.messages,
        options: {
          temperature: settings.temperature,
          topP: settings.topP,
          topK: settings.topK,
          maxTokens: settings.maxTokens,
        },
        onToken: (token) => {
          if (!token) return;
          if (streamStartedAt == null) streamStartedAt = Date.now();
          buffer += token;
          pending += token;
          streamTokenEstimate += Math.max(1, estimateTextTokens(token));
          const elapsedSec =
            streamStartedAt != null ? (Date.now() - streamStartedAt) / 1000 : 0;
          const tokensPerSecond =
            elapsedSec > 0.05 ? streamTokenEstimate / elapsedSec : undefined;
          this.emit({
            type: "token",
            threadId,
            messageId: assistantMessageId,
            delta: token,
          });
          if (tokensPerSecond != null) {
            this.emit({
              type: "metrics",
              threadId,
              messageId: assistantMessageId,
              metrics: {
                tokensPerSecond,
                contextTokensUsed,
                contextTokensMax,
                contextTrimmed: trimmed.trimmedCount > 0,
              },
            });
          }
          scheduleFlush();
        },
        signal: abort.signal,
      });

      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flush(true);
      await flushInFlight;

      const finalContent =
        (result?.response && result.response.length >= buffer.length
          ? result.response
          : buffer) || "";
      const totalTimeMs = result?.totalTimeMs;
      const totalTokens = result?.totalTokens;
      const decodeTps =
        typeof (result as { decodeTps?: number } | undefined)?.decodeTps ===
        "number"
          ? (result as { decodeTps: number }).decodeTps
          : totalTimeMs && totalTokens
            ? totalTokens / (totalTimeMs / 1000)
            : streamStartedAt != null && streamTokenEstimate > 0
              ? streamTokenEstimate / ((Date.now() - streamStartedAt) / 1000)
              : undefined;

      await this.repos.messages.finalize(assistantMessageId, "complete", {
        content: finalContent,
        metadata: {
          timeToFirstTokenMs: result?.timeToFirstTokenMs,
          totalTimeMs,
          totalTokens,
          tokensPerSecond: decodeTps,
          contextTokensUsed,
          contextTokensMax,
        },
      });
      if (decodeTps != null) {
        this.emit({
          type: "metrics",
          threadId,
          messageId: assistantMessageId,
          metrics: {
            tokensPerSecond: decodeTps,
            contextTokensUsed,
            contextTokensMax,
            contextTrimmed: trimmed.trimmedCount > 0,
          },
        });
      }
      await this.repos.threads.touch(threadId);

      this.emit({ type: "completed", threadId, messageId: assistantMessageId });
      void this.maybeGenerateTitle(threadId).catch((err) => {
        if (__DEV__)
          console.warn("[GenerationController] title generation failed:", err);
      });
    } catch (err) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      try {
        flush(true);
        await flushInFlight;
      } catch {
        // already failing; swallow secondary error.
      }
      const wasAborted = abort.signal.aborted;
      const message = err instanceof Error ? err.message : String(err);
      if (wasAborted) {
        await this.repos.messages.finalize(assistantMessageId, "cancelled");
        this.emit({
          type: "cancelled",
          threadId,
          messageId: assistantMessageId,
        });
      } else {
        await this.repos.messages.finalize(assistantMessageId, "failed", {
          error: message,
        });
        this.emit({
          type: "failed",
          threadId,
          messageId: assistantMessageId,
          error: message,
        });
      }
    } finally {
      this.running = null;
    }
  }

  private async maybeGenerateTitle(threadId: string): Promise<void> {
    const thread: Thread | null = await this.repos.threads.getById(threadId);
    if (!thread) return;
    if (thread.title && thread.title !== "New chat") return;
    const firstUser = await this.repos.messages.firstUserMessage(threadId);
    if (!firstUser) return;

    const baseline = fallbackTitle(firstUser.content);
    await this.repos.threads.rename(threadId, baseline);
    this.emit({ type: "title", threadId, title: baseline });

    try {
      const result = await this.client.complete({
        messages: buildTitlePrompt(firstUser.content),
        options: {
          temperature: 0.2,
          topP: 0.9,
          topK: 40,
          maxTokens: TITLE_MAX_TOKENS,
          stopSequences: ["\n"],
        },
      });
      const generated = sanitizeTitle(result?.response ?? "");
      if (generated && generated !== "New chat") {
        await this.repos.threads.rename(threadId, generated);
        this.emit({ type: "title", threadId, title: generated });
      }
    } catch {
      // Keep the deterministic fallback already saved.
    }
  }
}

async function loadAttachmentsForMessages(
  repos: Repositories,
  messages: Message[],
): Promise<Map<string, Attachment[]>> {
  const map = new Map<string, Attachment[]>();
  for (const m of messages) {
    const atts = await repos.attachments.listForMessage(m.id);
    if (atts.length > 0) map.set(m.id, atts);
  }
  return map;
}

// Helper to keep the messages repo lookup explicit (avoids unused import).
export type _MessagesRepoRef = MessagesRepo;
