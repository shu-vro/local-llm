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
  createCactusClient,
  disposeCactusClient,
  setActiveCactusClient,
} from "@/ai/cactusClient";
import { GenerationController } from "@/ai/generationController";
import {
  CatalogModel,
  displayIdToRegistryAlias,
  fetchCatalog,
} from "@/ai/modelCatalog";
import {
  assertModelInRegistry,
  checkModelOnDisk,
  deleteModelFromDisk,
  resolveRegistryAlias,
  switchActiveModelClient,
} from "@/ai/modelManager";
import {
  DEFAULT_MODEL_DISPLAY_ID,
  DEFAULT_MODEL_QUANTIZATION,
  type ModelQuantization,
} from "@/ai/models";
import { corpusPath, listCorpusEntries } from "@/ai/rag";
import { ModelState } from "@/db/repositories/modelStateRepo";
import { useDatabase } from "@/hooks/useDatabase";

export interface ModelInstallState {
  displayId: string;
  downloaded: boolean;
  initialized: boolean;
  downloadProgress: number;
  isDownloading: boolean;
  error: string | null;
  quantization: ModelQuantization;
}

export interface CactusModelStatus {
  modelId: string;
  displayName: string;
  registryAlias: string;
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  isInitializing: boolean;
  isInitialized: boolean;
  error: string | null;
  quantization: ModelQuantization;
  supportsVision: boolean;
}

export interface CactusContextValue {
  client: CactusClient | null;
  controller: GenerationController | null;
  isClientReady: boolean;
  status: CactusModelStatus;
  catalog: CatalogModel[];
  catalogLoading: boolean;
  activeCatalogModel: CatalogModel | null;
  installedStates: Map<string, ModelInstallState>;
  downloadModel: (
    displayId: string,
    quantization?: ModelQuantization,
  ) => Promise<void>;
  deleteModel: (displayId: string) => Promise<void>;
  setActiveModel: (displayId: string) => Promise<void>;
  initializeModel: () => Promise<void>;
  cancelGeneration: () => Promise<void>;
  destroy: () => Promise<void>;
  refreshCorpus: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
}

export const CactusContext = createContext<CactusContextValue | null>(null);

function catalogEntryFor(
  catalog: CatalogModel[],
  displayId: string,
): CatalogModel | null {
  return catalog.find((m) => m.displayId === displayId) ?? null;
}

export function CactusProvider({ children }: { children: React.ReactNode }) {
  const dbCtx = useDatabase({ optional: true });
  const [client, setClient] = useState<CactusClient | null>(null);
  const [controller, setController] = useState<GenerationController | null>(
    null,
  );
  const [isClientReady, setIsClientReady] = useState(false);
  const [catalog, setCatalog] = useState<CatalogModel[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [activeDisplayId, setActiveDisplayId] = useState(
    DEFAULT_MODEL_DISPLAY_ID,
  );
  const [activeQuant, setActiveQuant] = useState<ModelQuantization>(
    DEFAULT_MODEL_QUANTIZATION,
  );
  const [installedStates, setInstalledStates] = useState<
    Map<string, ModelInstallState>
  >(new Map());
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const downloadingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const models = await fetchCatalog();
      if (mountedRef.current) setCatalog(models);
    } finally {
      if (mountedRef.current) setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  const syncInstalledFromDb = useCallback(
    async (rows: ModelState[]) => {
      const map = new Map<string, ModelInstallState>();
      for (const row of rows) {
        const alias = resolveRegistryAlias(row.modelId, row.localAlias);
        const onDisk = await checkModelOnDisk(alias);
        if (onDisk && !row.downloaded && dbCtx?.repos) {
          await dbCtx.repos.modelState.markDownloaded(row.modelId);
        }
        map.set(row.modelId, {
          displayId: row.modelId,
          downloaded: onDisk,
          initialized: row.initialized,
          downloadProgress: onDisk ? 1 : row.downloadProgress,
          isDownloading: downloadingRef.current.has(row.modelId),
          error: null,
          quantization: row.quantization ?? DEFAULT_MODEL_QUANTIZATION,
        });
      }
      if (mountedRef.current) setInstalledStates(map);
    },
    [dbCtx?.repos],
  );

  const bootstrapClient = useCallback(
    async (displayId: string, quant: ModelQuantization) => {
      if (!dbCtx?.repos) return;
      const entry = catalogEntryFor(catalog, displayId);
      const registryAlias = assertModelInRegistry(
        entry?.registryAlias ?? displayIdToRegistryAlias(displayId),
        displayId,
      );

      await dbCtx.repos.modelState.upsert({
        modelId: displayId,
        displayName: entry?.shortName ?? displayId,
        localAlias: registryAlias,
        quantization: quant,
        provider: entry?.provider ?? null,
        sizeTier: entry?.size.sizeTier ?? null,
      });

      const corpus = listCorpusEntries();
      const corpusDir = corpus.length > 0 ? corpusPath() : undefined;
      const c = await switchActiveModelClient(
        {
          displayId,
          registryAlias,
          displayName: entry?.shortName ?? displayId,
          quantization: quant,
        },
        corpusDir,
      );
      setActiveCactusClient(c);

      const stored = await dbCtx.repos.modelState.get(displayId);
      const onDisk = await c.checkModelOnDisk();
      if (onDisk) {
        c.markAsDownloaded();
        await dbCtx.repos.modelState.markDownloaded(displayId);
        setInstalledStates((prev) => {
          const next = new Map(prev);
          const cur = next.get(displayId) ?? {
            displayId,
            downloaded: false,
            initialized: false,
            downloadProgress: 0,
            isDownloading: false,
            error: null,
            quantization: quant,
          };
          next.set(displayId, {
            ...cur,
            downloaded: true,
            downloadProgress: 1,
          });
          return next;
        });
      }

      if (mountedRef.current) {
        setClient(c);
        setController(new GenerationController(dbCtx.repos, c));
        setIsClientReady(true);
        setIsInitialized(stored?.initialized ?? false);
        setActiveDisplayId(displayId);
        setActiveQuant(quant);
      }
    },
    [catalog, dbCtx?.repos],
  );

  useEffect(() => {
    if (!dbCtx?.repos || catalog.length === 0) return;
    let cancelled = false;

    void (async () => {
      const settings = await dbCtx.repos!.settings.getAll();
      const activeId = settings.activeModelId;
      const rows = await dbCtx.repos!.modelState.list();
      await syncInstalledFromDb(rows);

      const legacy = rows.find(
        (r) =>
          r.modelId === "gemma-4-e2b-it" &&
          activeId === DEFAULT_MODEL_DISPLAY_ID,
      );
      if (legacy && !rows.some((r) => r.modelId === DEFAULT_MODEL_DISPLAY_ID)) {
        await dbCtx.repos!.modelState.upsert({
          modelId: DEFAULT_MODEL_DISPLAY_ID,
          displayName: legacy.displayName,
          localAlias: legacy.localAlias ?? "gemma-4-e2b-it",
          downloaded: legacy.downloaded,
          initialized: legacy.initialized,
          downloadProgress: legacy.downloadProgress,
          quantization: legacy.quantization ?? DEFAULT_MODEL_QUANTIZATION,
        });
      }

      const state =
        (await dbCtx.repos!.modelState.get(activeId)) ??
        (await dbCtx.repos!.modelState.get(DEFAULT_MODEL_DISPLAY_ID));
      const quant = state?.quantization ?? DEFAULT_MODEL_QUANTIZATION;

      if (cancelled || !mountedRef.current) return;
      try {
        await bootstrapClient(activeId, quant);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (mountedRef.current) setActiveError(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapClient, catalog.length, dbCtx?.repos, syncInstalledFromDb]);

  const activeCatalogModel = useMemo(
    () => catalogEntryFor(catalog, activeDisplayId),
    [catalog, activeDisplayId],
  );

  const activeInstall = installedStates.get(activeDisplayId);

  const status = useMemo<CactusModelStatus>(
    () => ({
      modelId: activeDisplayId,
      displayName:
        activeCatalogModel?.shortName ??
        activeInstall?.displayId ??
        activeDisplayId,
      registryAlias:
        activeCatalogModel?.registryAlias ??
        displayIdToRegistryAlias(activeDisplayId),
      isDownloaded: Boolean(activeInstall?.downloaded || client?.isDownloaded),
      isDownloading: activeInstall?.isDownloading ?? false,
      downloadProgress: activeInstall?.downloadProgress ?? 0,
      isInitializing,
      isInitialized,
      error: activeError ?? activeInstall?.error ?? null,
      quantization: activeQuant,
      supportsVision: activeCatalogModel?.supportsVision ?? false,
    }),
    [
      activeCatalogModel,
      activeDisplayId,
      activeInstall,
      activeQuant,
      activeError,
      client?.isDownloaded,
      isInitialized,
      isInitializing,
    ],
  );

  const patchInstall = useCallback(
    (displayId: string, patch: Partial<ModelInstallState>) => {
      setInstalledStates((prev) => {
        const next = new Map(prev);
        const cur = next.get(displayId) ?? {
          displayId,
          downloaded: false,
          initialized: false,
          downloadProgress: 0,
          isDownloading: false,
          error: null,
          quantization: DEFAULT_MODEL_QUANTIZATION,
        };
        next.set(displayId, { ...cur, ...patch });
        return next;
      });
    },
    [],
  );

  const downloadModel = useCallback(
    async (displayId: string, quantization?: ModelQuantization) => {
      if (!dbCtx?.repos) throw new Error("Database not ready");
      const entry = catalogEntryFor(catalog, displayId);
      const registryAlias = assertModelInRegistry(
        entry?.registryAlias ?? null,
        displayId,
      );
      const quant =
        quantization ?? entry?.quantizations[0] ?? DEFAULT_MODEL_QUANTIZATION;

      if (downloadingRef.current.has(displayId)) return;
      downloadingRef.current.add(displayId);
      patchInstall(displayId, {
        isDownloading: true,
        error: null,
        quantization: quant,
      });

      let targetClient = client;
      if (displayId !== activeDisplayId || !targetClient) {
        targetClient = createCactusClient({
          modelAlias: registryAlias,
          quantization: quant,
        });
      }

      try {
        await targetClient.download((p) => {
          patchInstall(displayId, { downloadProgress: p });
          if (dbCtx.repos) {
            void dbCtx.repos.modelState.setDownloadProgress(displayId, p);
          }
        });
        await dbCtx.repos.modelState.upsert({
          modelId: displayId,
          displayName: entry?.shortName ?? displayId,
          localAlias: registryAlias,
          downloaded: true,
          downloadProgress: 1,
          quantization: quant,
          provider: entry?.provider ?? null,
          sizeTier: entry?.size.sizeTier ?? null,
        });
        patchInstall(displayId, {
          downloaded: true,
          isDownloading: false,
          downloadProgress: 1,
        });

        if (displayId === activeDisplayId && targetClient !== client) {
          await targetClient.destroy();
        } else if (displayId === activeDisplayId && client) {
          client.markAsDownloaded();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        patchInstall(displayId, { isDownloading: false, error: message });
        throw err;
      } finally {
        downloadingRef.current.delete(displayId);
      }
    },
    [activeDisplayId, catalog, client, dbCtx?.repos, patchInstall],
  );

  const deleteModel = useCallback(
    async (displayId: string) => {
      if (!dbCtx?.repos) return;
      const entry = catalogEntryFor(catalog, displayId);
      const alias = entry?.registryAlias ?? displayIdToRegistryAlias(displayId);
      await deleteModelFromDisk(alias);
      await dbCtx.repos.modelState.clear(displayId);
      patchInstall(displayId, {
        downloaded: false,
        initialized: false,
        downloadProgress: 0,
      });
      if (displayId === activeDisplayId) {
        setIsInitialized(false);
        if (client && dbCtx.repos) {
          await bootstrapClient(activeDisplayId, activeQuant);
        }
      }
    },
    [
      activeDisplayId,
      activeQuant,
      catalog,
      client,
      controller,
      dbCtx?.repos,
      patchInstall,
    ],
  );

  const initializeModelInternal = useCallback(async () => {
    if (!client || !dbCtx?.repos) return;
    if (isInitialized || isInitializing) return;
    setIsInitializing(true);
    setActiveError(null);
    try {
      await client.init();
      await dbCtx.repos.modelState.markInitialized(activeDisplayId, true);
      patchInstall(activeDisplayId, { initialized: true });
      if (mountedRef.current) setIsInitialized(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (mountedRef.current) setActiveError(message);
      throw err;
    } finally {
      if (mountedRef.current) setIsInitializing(false);
    }
  }, [
    activeDisplayId,
    client,
    dbCtx?.repos,
    isInitialized,
    isInitializing,
    patchInstall,
  ]);

  const initializeModel = useCallback(async () => {
    await initializeModelInternal();
  }, [initializeModelInternal]);

  const setActiveModel = useCallback(
    async (displayId: string) => {
      if (!dbCtx?.repos) throw new Error("Database not ready");
      if (controller?.isGenerating) {
        throw new Error("Stop the current generation before switching models.");
      }
      const install = installedStates.get(displayId);
      if (!install?.downloaded) {
        throw new Error("Download this model before setting it as active.");
      }
      const quant = install.quantization ?? DEFAULT_MODEL_QUANTIZATION;
      await dbCtx.repos.settings.update({ activeModelId: displayId });
      setIsInitialized(false);
      setActiveError(null);
      await bootstrapClient(displayId, quant);
      const state = installedStates.get(displayId);
      if (!state?.initialized) {
        await initializeModelInternal();
      }
    },
    [
      bootstrapClient,
      controller,
      dbCtx?.repos,
      initializeModelInternal,
      installedStates,
    ],
  );

  const cancelGeneration = useCallback(async () => {
    if (controller) await controller.cancel();
  }, [controller]);

  const destroy = useCallback(async () => {
    await disposeCactusClient();
    setClient(null);
    setController(null);
    setIsClientReady(false);
    setIsInitialized(false);
    if (dbCtx?.repos) await dbCtx.repos.modelState.deleteAll();
    setInstalledStates(new Map());
  }, [dbCtx?.repos]);

  const refreshCorpus = useCallback(async () => {
    if (!client) return;
    const entries = listCorpusEntries();
    await client.setCorpusDir(entries.length > 0 ? corpusPath() : undefined);
    if (dbCtx?.repos && entries.length > 0) {
      await dbCtx.repos.modelState.markInitialized(activeDisplayId, false);
    }
    setIsInitialized(false);
  }, [activeDisplayId, client, dbCtx?.repos]);

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
      catalog,
      catalogLoading,
      activeCatalogModel,
      installedStates,
      downloadModel,
      deleteModel,
      setActiveModel,
      initializeModel,
      cancelGeneration,
      destroy,
      refreshCorpus,
      refreshCatalog,
    }),
    [
      client,
      controller,
      isClientReady,
      status,
      catalog,
      catalogLoading,
      activeCatalogModel,
      installedStates,
      downloadModel,
      deleteModel,
      setActiveModel,
      initializeModel,
      cancelGeneration,
      destroy,
      refreshCorpus,
      refreshCatalog,
    ],
  );

  return (
    <CactusContext.Provider value={value}>{children}</CactusContext.Provider>
  );
}
