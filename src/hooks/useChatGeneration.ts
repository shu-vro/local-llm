import { useCallback, useEffect, useState } from "react";

import { PreparedAttachment } from "@/ai/attachmentPipeline";
import { GenerationEvent, GenerationMetrics } from "@/ai/generationController";
import { useCactus } from "@/hooks/useCactus";
import { useSettings } from "@/hooks/useSettings";

export interface ChatGenerationApi {
  isGenerating: boolean;
  activeThreadId: string | null;
  activeMessageId: string | null;
  lastEvent: GenerationEvent | null;
  metrics: GenerationMetrics | null;
  send: (
    threadId: string,
    content: string,
    attachments?: PreparedAttachment[],
  ) => Promise<void>;
  regenerate: (threadId: string, assistantMessageId: string) => Promise<void>;
  editAndRegenerate: (
    threadId: string,
    userMessageId: string,
    newContent: string,
  ) => Promise<void>;
  cancel: () => Promise<void>;
}

export function useChatGeneration(): ChatGenerationApi {
  const { controller, status } = useCactus();
  const { settings } = useSettings();
  const [lastEvent, setLastEvent] = useState<GenerationEvent | null>(null);
  const [metrics, setMetrics] = useState<GenerationMetrics | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!controller) return;
    const unsub = controller.addListener((event) => {
      setLastEvent(event);
      if (event.type === "metrics" && event.metrics) {
        setMetrics(event.metrics);
      }
      if (event.type === "assistant-created") {
        setIsGenerating(true);
        setActiveThreadId(event.threadId);
        setActiveMessageId(event.messageId ?? null);
        setMetrics(null);
      } else if (
        event.type === "completed" ||
        event.type === "cancelled" ||
        event.type === "failed"
      ) {
        setIsGenerating(false);
        setActiveMessageId(null);
      }
    });
    return () => {
      unsub();
    };
  }, [controller]);

  const ensureReady = useCallback(() => {
    if (!controller) throw new Error("Generation controller not ready");
    if (!status.isDownloaded)
      throw new Error(
        "Model is not downloaded yet. Open Models to download one.",
      );
    if (!status.isInitialized)
      throw new Error("Model is not initialized. Open Models to initialize.");
  }, [controller, status.isDownloaded, status.isInitialized]);

  const send: ChatGenerationApi["send"] = useCallback(
    async (threadId, content, attachments) => {
      ensureReady();
      if (!controller) return;
      const trimmed = content.trim();
      if (!trimmed && (!attachments || attachments.length === 0)) return;
      await controller.start({
        threadId,
        userContent: trimmed,
        attachments,
        settings,
      });
    },
    [controller, ensureReady, settings],
  );

  const regenerate: ChatGenerationApi["regenerate"] = useCallback(
    async (threadId, assistantMessageId) => {
      ensureReady();
      if (!controller) return;
      await controller.regenerate({
        threadId,
        fromAssistantMessageId: assistantMessageId,
        settings,
      });
    },
    [controller, ensureReady, settings],
  );

  const editAndRegenerate: ChatGenerationApi["editAndRegenerate"] = useCallback(
    async (threadId, userMessageId, newContent) => {
      ensureReady();
      if (!controller) return;
      await controller.editUserAndRegenerate({
        threadId,
        userMessageId,
        newContent,
        settings,
      });
    },
    [controller, ensureReady, settings],
  );

  const cancel: ChatGenerationApi["cancel"] = useCallback(async () => {
    if (!controller) return;
    await controller.cancel();
  }, [controller]);

  return {
    isGenerating,
    activeThreadId,
    activeMessageId,
    lastEvent,
    metrics,
    send,
    regenerate,
    editAndRegenerate,
    cancel,
  };
}
