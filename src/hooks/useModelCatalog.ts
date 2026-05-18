import { useMemo, useState } from "react";

import {
  CatalogModel,
  filterChatModels,
  filterDownloaded,
  groupByProvider,
  ProviderGroup,
  searchModels,
} from "@/ai/modelCatalog";
import { useCactus } from "@/hooks/useCactus";

export type CatalogTab = "chat" | "all" | "downloaded";

export function useModelCatalog() {
  const { catalog, catalogLoading, installedStates, status, refreshCatalog } =
    useCactus();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<CatalogTab>("chat");

  const downloadedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [id, st] of installedStates) {
      if (st.downloaded) ids.add(id);
    }
    return ids;
  }, [installedStates]);

  const filtered = useMemo(() => {
    let list: CatalogModel[] = catalog;
    if (tab === "chat") list = filterChatModels(catalog);
    else if (tab === "downloaded")
      list = filterDownloaded(catalog, downloadedIds);
    return searchModels(list, query);
  }, [catalog, downloadedIds, query, tab]);

  const groups = useMemo(() => groupByProvider(filtered), [filtered]);

  const activeDisplayId = status.modelId;

  return {
    catalog,
    catalogLoading,
    query,
    setQuery,
    tab,
    setTab,
    groups,
    filtered,
    downloadedIds,
    activeDisplayId,
    refreshCatalog,
  };
}

export type { CatalogModel, ProviderGroup };
