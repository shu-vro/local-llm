import { useCallback, useEffect, useRef, useState } from "react";

import { Attachment } from "@/db/repositories/attachmentsRepo";
import { Message } from "@/db/repositories/messagesRepo";
import { useDatabase } from "@/hooks/useDatabase";

const PAGE_SIZE = 60;

export interface UseMessagesResult {
  messages: Message[];
  attachmentsByMessage: Map<string, Attachment[]>;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadOlder: () => Promise<void>;
  applyLocal: (updater: (msgs: Message[]) => Message[]) => void;
}

export function useMessages(
  threadId: string | null | undefined,
): UseMessagesResult {
  const { repos } = useDatabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachmentsByMessage, setAttachments] = useState<
    Map<string, Attachment[]>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const oldestRef = useRef<number | null>(null);

  const fetchInitial = useCallback(async () => {
    if (!repos || !threadId) {
      setMessages([]);
      setAttachments(new Map());
      setHasMore(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const page = await repos.messages.listForThread(threadId, {
        limit: PAGE_SIZE,
      });
      setMessages(page);
      oldestRef.current = page[0]?.createdAt ?? null;
      setHasMore(page.length === PAGE_SIZE);
      const map = new Map<string, Attachment[]>();
      for (const m of page) {
        const atts = await repos.attachments.listForMessage(m.id);
        if (atts.length > 0) map.set(m.id, atts);
      }
      setAttachments(map);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [repos, threadId]);

  useEffect(() => {
    void fetchInitial();
  }, [fetchInitial]);

  const loadOlder = useCallback(async () => {
    if (!repos || !threadId || !hasMore || oldestRef.current == null) return;
    try {
      const page = await repos.messages.listForThread(threadId, {
        limit: PAGE_SIZE,
        beforeCreatedAt: oldestRef.current,
      });
      if (page.length === 0) {
        setHasMore(false);
        return;
      }
      setMessages((prev) => [...page, ...prev]);
      oldestRef.current = page[0]?.createdAt ?? oldestRef.current;
      setHasMore(page.length === PAGE_SIZE);
      const map = new Map(attachmentsByMessage);
      for (const m of page) {
        const atts = await repos.attachments.listForMessage(m.id);
        if (atts.length > 0) map.set(m.id, atts);
      }
      setAttachments(map);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [attachmentsByMessage, hasMore, repos, threadId]);

  const applyLocal = useCallback((updater: (msgs: Message[]) => Message[]) => {
    setMessages((prev) => updater(prev));
  }, []);

  return {
    messages,
    attachmentsByMessage,
    loading,
    error,
    hasMore,
    refresh: fetchInitial,
    loadOlder,
    applyLocal,
  };
}
