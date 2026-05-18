import { useEffect } from "react";

import { GenerationController } from "@/ai/generationController";
import { Message } from "@/db/repositories/messagesRepo";

/**
 * Applies generation events directly to the message list.
 * Must not go through React state (e.g. lastEvent) or rapid token events are dropped.
 */
export function useGenerationMessageSync(
  controller: GenerationController | null,
  threadId: string | null | undefined,
  applyLocal: (updater: (msgs: Message[]) => Message[]) => void,
  onTerminal?: () => void,
): void {
  useEffect(() => {
    if (!controller || !threadId) return;

    return controller.addListener((ev) => {
      if (ev.threadId !== threadId) return;

      switch (ev.type) {
        case "user-created":
        case "assistant-created":
          if (ev.message) {
            applyLocal((msgs) =>
              msgs.some((m) => m.id === ev.message!.id)
                ? msgs
                : [...msgs, ev.message!],
            );
          }
          break;
        case "token":
          if (ev.messageId && ev.delta) {
            const { messageId, delta } = ev;
            applyLocal((msgs) =>
              msgs.map((m) =>
                m.id === messageId
                  ? { ...m, content: m.content + delta, status: "streaming" }
                  : m,
              ),
            );
          }
          break;
        case "metrics":
          if (ev.messageId && ev.metrics?.tokensPerSecond != null) {
            const tps = ev.metrics.tokensPerSecond;
            applyLocal((msgs) =>
              msgs.map((m) =>
                m.id === ev.messageId
                  ? {
                      ...m,
                      metadata: { ...m.metadata, tokensPerSecond: tps },
                    }
                  : m,
              ),
            );
          }
          break;
        case "completed":
        case "cancelled":
        case "failed":
          if (ev.message) {
            const saved = ev.message;
            applyLocal((msgs) =>
              msgs.map((m) => (m.id === saved.id ? saved : m)),
            );
          } else if (ev.messageId) {
            const terminalStatus =
              ev.type === "completed"
                ? "complete"
                : ev.type === "cancelled"
                  ? "cancelled"
                  : "failed";
            applyLocal((msgs) =>
              msgs.map((m) =>
                m.id === ev.messageId
                  ? {
                      ...m,
                      status: terminalStatus,
                      error:
                        ev.type === "failed" ? (ev.error ?? m.error) : null,
                    }
                  : m,
              ),
            );
          }
          onTerminal?.();
          break;
        default:
          break;
      }
    });
  }, [applyLocal, controller, onTerminal, threadId]);
}
