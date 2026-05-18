import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CactusClient,
  MODEL_DISPLAY,
  MODEL_ID,
  disposeCactusClient,
  getCactusClient,
} from "@/ai/cactusClient";
import { GenerationController } from "@/ai/generationController";
import { corpusPath, listCorpusEntries } from "@/ai/rag";
import { useDatabase } from "@/hooks/useDatabase";

export interface CactusModelStatus {
  modelId: string;
  displayName: string;
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  isInitializing: boolean;
  isInitialized: boolean;
  error: string | null;
}

export interface CactusContextValue {
  client: CactusClient | null;
  controller: GenerationController | null;
  isClientReady: boolean;
  status: CactusModelStatus;
  downloadModel: () => Promise<void>;
  initializeModel: () => Promise<void>;
  cancelGeneration: () => Promise<void>;
  destroy: () => Promise<void>;
  refreshCorpus: () => Promise<void>;
}

export const CactusContext = createContext<CactusContextValue | null>(null);

const INITIAL_STATUS: CactusModelStatus = {
  modelId: MODEL_ID,
  displayName: MODEL_DISPLAY,
  isDownloaded: false,
  isDownloading: false,
  downloadProgress: 0,
  isInitializing: false,
  isInitialized: false,
  error: null,
};

export function CactusProvider({ children }: { children: React.ReactNode }) {
  const dbCtx = useDatabase({ optional: true });
  const [client, setClient] = useState<CactusClient | null>(null);
  const [controller, setController] = useState<GenerationController | null>(
    null,
  );
  const [isClientReady, setIsClientReady] = useState(false);
  const [status, setStatus] = useState<CactusModelStatus>(INITIAL_STATUS);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!dbCtx?.repos) return;
    let cancelled = false;
    void (async () => {
      const stored = await dbCtx.repos!.modelState.get(MODEL_ID);
      if (cancelled || !mountedRef.current) return;
      if (stored) {
        setStatus((s) => ({
          ...s,
          isDownloaded: stored.downloaded,
          downloadProgress: stored.downloaded ? 1 : stored.downloadProgress,
        }));
      } else {
        await dbCtx.repos!.modelState.upsert({
          modelId: MODEL_ID,
          displayName: MODEL_DISPLAY,
          localAlias: MODEL_ID,
        });
      }
      const c = getCactusClient();
      const corpus = listCorpusEntries();
      if (corpus.length > 0) {
        await c.setCorpusDir(corpusPath());
      }

      const onDisk = await c.checkModelOnDisk();
      if (onDisk) {
        c.markAsDownloaded();
      }

      if (cancelled || !mountedRef.current) return;

      setClient(c);
      setController(new GenerationController(dbCtx.repos!, c));
      setIsClientReady(true);

      if (onDisk || stored?.downloaded) {
        setStatus((s) => ({
          ...s,
          isDownloaded: true,
          downloadProgress: 1,
          isInitialized: stored?.initialized ?? s.isInitialized,
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dbCtx?.repos]);

  const downloadModel = useCallback(async () => {
    if (!client || !isClientReady) {
      throw new Error(
        "The on-device engine is still starting. Wait a moment and try again.",
      );
    }
    if (status.isDownloading) return;
    setStatus((s) => ({ ...s, isDownloading: true, error: null }));
    try {
      await client.download((p) => {
        if (!mountedRef.current) return;
        setStatus((s) => ({ ...s, downloadProgress: p }));
        if (dbCtx?.repos)
          void dbCtx.repos.modelState.setDownloadProgress(MODEL_ID, p);
      });
      if (dbCtx?.repos) {
        await dbCtx.repos.modelState.markDownloaded(MODEL_ID, null);
      }
      if (mountedRef.current) {
        setStatus((s) => ({
          ...s,
          isDownloading: false,
          isDownloaded: true,
          downloadProgress: 1,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (mountedRef.current) {
        setStatus((s) => ({ ...s, isDownloading: false, error: message }));
      }
      throw err;
    }
  }, [client, dbCtx?.repos, isClientReady, status.isDownloading]);

  const initializeModel = useCallback(async () => {
    if (!client || !isClientReady) {
      throw new Error(
        "The on-device engine is still starting. Wait a moment and try again.",
      );
    }
    if (status.isInitialized || status.isInitializing) return;
    setStatus((s) => ({ ...s, isInitializing: true, error: null }));
    try {
      await client.init();
      if (dbCtx?.repos) {
        await dbCtx.repos.modelState.markInitialized(MODEL_ID, true);
      }
      if (mountedRef.current) {
        setStatus((s) => ({
          ...s,
          isInitializing: false,
          isInitialized: true,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (mountedRef.current) {
        setStatus((s) => ({ ...s, isInitializing: false, error: message }));
      }
      throw err;
    }
  }, [
    client,
    dbCtx?.repos,
    isClientReady,
    status.isInitialized,
    status.isInitializing,
  ]);

  const cancelGeneration = useCallback(async () => {
    if (controller) await controller.cancel();
  }, [controller]);

  const destroy = useCallback(async () => {
    await disposeCactusClient();
    setClient(null);
    setController(null);
    setIsClientReady(false);
    setStatus(INITIAL_STATUS);
  }, []);

  const refreshCorpus = useCallback(async () => {
    if (!client) return;
    const entries = listCorpusEntries();
    await client.setCorpusDir(entries.length > 0 ? corpusPath() : undefined);
    if (dbCtx?.repos && entries.length > 0) {
      await dbCtx.repos.modelState.markInitialized(MODEL_ID, false);
    }
    setStatus((s) => ({ ...s, isInitialized: false }));
  }, [client, dbCtx?.repos]);

  useEffect(() => {
    return () => {
      void disposeCactusClient().catch(() => undefined);
    };
  }, []);

  const value = useMemo<CactusContextValue>(
    () => ({
      client,
      controller,
      isClientReady,
      status,
      downloadModel,
      initializeModel,
      cancelGeneration,
      destroy,
      refreshCorpus,
    }),
    [
      client,
      controller,
      isClientReady,
      status,
      downloadModel,
      initializeModel,
      cancelGeneration,
      destroy,
      refreshCorpus,
    ],
  );

  return (
    <CactusContext.Provider value={value}>{children}</CactusContext.Provider>
  );
}
