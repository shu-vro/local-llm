import { getRegistry } from "cactus-react-native";
import { Platform } from "react-native";

import bundledModels from "@/ai/data/cactus-models.json";
import {
  capabilityChips,
  ModelCapabilities,
  parseCapabilities,
  supportsChat,
  supportsVision,
} from "@/ai/modelCapabilities";
import type { ModelQuantization } from "@/ai/models";
import {
  formatDownloadSize,
  inferModelSizeSpec,
  ModelSizeSpec,
  sizeTierLabel,
} from "@/ai/modelSpec";

export interface CactusModelJsonEntry {
  model: string;
  int4: boolean;
  int8: boolean;
  fp16: boolean;
  apple: boolean;
  pipeline_tag: string;
  tags: string[];
  description: string;
}

export interface CatalogModel {
  displayId: string;
  registryAlias: string | null;
  provider: string;
  providerLabel: string;
  shortName: string;
  description: string;
  pipelineTag: string;
  tags: string[];
  capabilities: ModelCapabilities;
  capabilityChips: string[];
  size: ModelSizeSpec;
  quantizations: ModelQuantization[];
  inRegistry: boolean;
  recommended: boolean;
  isChatModel: boolean;
  supportsVision: boolean;
  downloadSizeLabel: (quant: ModelQuantization) => string;
}

export interface ProviderGroup {
  id: string;
  label: string;
  models: CatalogModel[];
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google Gemma",
  qwen: "Qwen",
  liquidai: "Liquid AI",
  tencent: "Tencent",
  openai: "OpenAI",
  nvidia: "NVIDIA",
  usefulsensors: "Useful Sensors",
  "nomic-ai": "Nomic",
  snakers4: "Silero",
  pyannote: "Pyannote",
};

/** `google/gemma-4-E2B-it` → `gemma-4-e2b-it` */
export function displayIdToRegistryAlias(displayId: string): string {
  const slash = displayId.indexOf("/");
  const name = slash >= 0 ? displayId.slice(slash + 1) : displayId;
  return name.toLowerCase();
}

export function registryAliasToDisplayId(
  alias: string,
  entries: CactusModelJsonEntry[],
): string {
  const lower = alias.toLowerCase();
  const match = entries.find(
    (e) => displayIdToRegistryAlias(e.model) === lower,
  );
  if (match) return match.model;
  const parts = alias.split("/");
  if (parts.length === 2) return alias;
  return `unknown/${alias}`;
}

function providerFromDisplayId(displayId: string): string {
  const slash = displayId.indexOf("/");
  return slash >= 0 ? displayId.slice(0, slash).toLowerCase() : "other";
}

function shortNameFromDisplayId(displayId: string): string {
  const slash = displayId.indexOf("/");
  return slash >= 0 ? displayId.slice(slash + 1) : displayId;
}

function isChatPipeline(tag: string, tags: string[]): boolean {
  const chatTags = tag === "text-generation" || tag === "image-text-to-text";
  return chatTags && tags.includes("completion");
}

function scoreRecommended(
  cap: ModelCapabilities,
  size: ModelSizeSpec,
): boolean {
  if (!cap.completion) return false;
  const m = size.paramsMillions ?? 2000;
  if (Platform.OS === "ios" && cap.appleNpu && m <= 2500) return true;
  if (m <= 800) return true;
  if (m <= 2000 && cap.vision) return true;
  return false;
}

export function mergeCatalogEntry(
  entry: CactusModelJsonEntry,
  registryKeys: Set<string>,
): CatalogModel {
  const displayId = entry.model;
  const registryAlias = displayIdToRegistryAlias(displayId);
  const inRegistry = registryKeys.has(registryAlias);
  const provider = providerFromDisplayId(displayId);
  const size = inferModelSizeSpec(displayId, entry.description);
  const capabilities = parseCapabilities(entry.tags, entry.apple, displayId);
  const quants: ModelQuantization[] = [];
  if (entry.int4) quants.push("int4");
  if (entry.int8) quants.push("int8");

  const isChatModel = isChatPipeline(entry.pipeline_tag, entry.tags);

  return {
    displayId,
    registryAlias: inRegistry ? registryAlias : null,
    provider,
    providerLabel: PROVIDER_LABELS[provider] ?? provider,
    shortName: shortNameFromDisplayId(displayId),
    description: entry.description,
    pipelineTag: entry.pipeline_tag,
    tags: entry.tags,
    capabilities,
    capabilityChips: capabilityChips(capabilities),
    size,
    quantizations: quants,
    inRegistry,
    recommended: scoreRecommended(capabilities, size),
    isChatModel,
    supportsVision: supportsVision(capabilities),
    downloadSizeLabel: (quant: ModelQuantization) =>
      formatDownloadSize(
        quant === "int8" ? size.downloadMbInt8 : size.downloadMbInt4,
      ),
  };
}

export async function fetchCatalog(): Promise<CatalogModel[]> {
  let registryKeys = new Set<string>();
  try {
    const registry = await getRegistry();
    registryKeys = new Set(Object.keys(registry));
  } catch {
    // Offline: bundled list only; downloads may fail until online.
  }

  const entries = bundledModels as CactusModelJsonEntry[];
  return entries.map((e) => mergeCatalogEntry(e, registryKeys));
}

export function filterChatModels(models: CatalogModel[]): CatalogModel[] {
  return models.filter((m) => m.isChatModel && supportsChat(m.capabilities));
}

export function filterDownloaded(
  models: CatalogModel[],
  downloadedIds: Set<string>,
): CatalogModel[] {
  return models.filter((m) => downloadedIds.has(m.displayId));
}

export function searchModels(
  models: CatalogModel[],
  query: string,
): CatalogModel[] {
  const q = query.trim().toLowerCase();
  if (!q) return models;
  return models.filter(
    (m) =>
      m.displayId.toLowerCase().includes(q) ||
      m.shortName.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.providerLabel.toLowerCase().includes(q) ||
      m.capabilityChips.some((c) => c.toLowerCase().includes(q)) ||
      m.size.paramsLabel.toLowerCase().includes(q),
  );
}

export function groupByProvider(models: CatalogModel[]): ProviderGroup[] {
  const map = new Map<string, CatalogModel[]>();
  for (const m of models) {
    const list = map.get(m.provider) ?? [];
    list.push(m);
    map.set(m.provider, list);
  }
  const order = [
    "google",
    "qwen",
    "liquidai",
    "tencent",
    "openai",
    "nvidia",
    "usefulsensors",
    "nomic-ai",
    "snakers4",
    "pyannote",
  ];
  const groups: ProviderGroup[] = [];
  const seen = new Set<string>();
  for (const id of order) {
    const list = map.get(id);
    if (list?.length) {
      groups.push({
        id,
        label: PROVIDER_LABELS[id] ?? id,
        models: list.sort(
          (a, b) =>
            (a.size.paramsMillions ?? 9999) - (b.size.paramsMillions ?? 9999),
        ),
      });
      seen.add(id);
    }
  }
  for (const [id, list] of map) {
    if (!seen.has(id)) {
      groups.push({
        id,
        label: PROVIDER_LABELS[id] ?? id,
        models: list,
      });
    }
  }
  return groups;
}

export { sizeTierLabel, supportsVision };
