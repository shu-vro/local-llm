import { useCallback } from "react";

import { useCactus } from "@/hooks/useCactus";

export function useModelState() {
  const { status, downloadModel, initializeModel, cancelGeneration, destroy } =
    useCactus();
  const isReady = status.isDownloaded;

  const ensureReady = useCallback(async () => {
    if (!status.isDownloaded) {
      await downloadModel(status.modelId);
    }
    if (!status.isInitialized) {
      await initializeModel();
    }
  }, [
    downloadModel,
    initializeModel,
    status.isDownloaded,
    status.isInitialized,
  ]);

  return {
    status,
    isReady,
    downloadModel,
    initializeModel,
    ensureReady,
    cancelGeneration,
    destroy,
  };
}
