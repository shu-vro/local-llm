import { useCallback, useEffect, useRef, useState } from "react";

import { ThreadWithPreview } from "@/db/repositories/threadsRepo";
import { useDatabase } from "@/hooks/useDatabase";

const PAGE_SIZE = 50;

export interface UseThreadsResult {
  threads: ThreadWithPreview[];
  loading: boolean;
  error: Error | null;
  search: string;
  setSearch: (value: string) => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  createThread: () => Promise<string>;
  renameThread: (id: string, title: string) => Promise<void>;
  deleteThread: (id: string) => Promise<void>;
  togglePinned: (id: string, pinned: boolean) => Promise<void>;
}

export function useThreads(): UseThreadsResult {
  const { repos } = useDatabase();
  const [threads, setThreads] = useState<ThreadWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearchState] = useState("");
  const offsetRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (!repos) return;
      const offset = reset ? 0 : offsetRef.current;
      try {
        if (reset) setLoading(true);
        const page = await repos.threads.list({
          limit: PAGE_SIZE,
          offset,
          search: search || undefined,
        });
        setThreads((prev) => (reset ? page : [...prev, ...page]));
        setHasMore(page.length === PAGE_SIZE);
        offsetRef.current = offset + page.length;
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (reset) setLoading(false);
      }
    },
    [repos, search],
  );

  const refresh = useCallback(async () => {
    if (inFlightRef.current) await inFlightRef.current.catch(() => undefined);
    const op = fetchPage(true);
    inFlightRef.current = op;
    try {
      await op;
    } finally {
      if (inFlightRef.current === op) inFlightRef.current = null;
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    await fetchPage(false);
  }, [fetchPage, hasMore]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
  }, []);

  const createThread = useCallback(async () => {
    if (!repos) throw new Error("Database not ready");
    const t = await repos.threads.create({ title: "New chat" });
    await refresh();
    return t.id;
  }, [refresh, repos]);

  const renameThread = useCallback(
    async (id: string, title: string) => {
      if (!repos) return;
      await repos.threads.rename(id, title);
      await refresh();
    },
    [refresh, repos],
  );

  const deleteThread = useCallback(
    async (id: string) => {
      if (!repos) return;
      await repos.threads.remove(id);
      await refresh();
    },
    [refresh, repos],
  );

  const togglePinned = useCallback(
    async (id: string, pinned: boolean) => {
      if (!repos) return;
      await repos.threads.setPinned(id, pinned);
      await refresh();
    },
    [refresh, repos],
  );

  return {
    threads,
    loading,
    error,
    search,
    setSearch,
    refresh,
    loadMore,
    hasMore,
    createThread,
    renameThread,
    deleteThread,
    togglePinned,
  };
}
