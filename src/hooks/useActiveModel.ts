import { useCactus } from "@/hooks/useCactus";

export function useActiveModel() {
  const {
    status,
    activeCatalogModel,
    downloadModel,
    deleteModel,
    setActiveModel,
    initializeModel,
    installedStates,
  } = useCactus();

  const install = installedStates.get(status.modelId);

  return {
    status,
    catalogModel: activeCatalogModel,
    install,
    displayName: status.displayName,
    supportsVision: status.supportsVision,
    downloadModel,
    deleteModel,
    setActiveModel,
    initializeModel,
  };
}
