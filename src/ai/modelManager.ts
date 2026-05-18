import { File } from "expo-file-system";

import {
  CactusClient,
  createCactusClient,
  disposeCactusClient,
} from "@/ai/cactusClient";
import { getCactusFileSystem } from "@/ai/cactusNative";
import { displayIdToRegistryAlias } from "@/ai/modelCatalog";
import { resolveModelDownloadUrl } from "@/ai/modelDownload";
import type { ModelQuantization } from "@/ai/models";
import { Repositories } from "@/db/repositories";
import { AppError } from "@/utils/errors";

export interface ActiveModelConfig {
  displayId: string;
  registryAlias: string;
  displayName: string;
  quantization: ModelQuantization;
}

export async function deleteModelFromDisk(
  registryAlias: string,
): Promise<void> {
  const fs = getCactusFileSystem();
  const storageName = registryAlias;
  try {
    const path = await fs.getModelPath(storageName);
    const target = new File(path);
    if (target.exists) {
      target.delete();
    }
  } catch {
    // Path may not exist.
  }
}

export async function checkModelOnDisk(
  registryAlias: string,
): Promise<boolean> {
  try {
    return await getCactusFileSystem().modelExists(registryAlias);
  } catch {
    return false;
  }
}

export function createClientForModel(
  registryAlias: string,
  quantization: ModelQuantization,
  corpusDir?: string,
): CactusClient {
  return createCactusClient({
    modelAlias: registryAlias,
    quantization,
    corpusDir,
  });
}

export async function downloadModelWeights(
  client: CactusClient,
  registryAlias: string,
  quantization: ModelQuantization,
  onProgress?: (p: number) => void,
): Promise<void> {
  const url = await resolveModelDownloadUrl(registryAlias, quantization, {
    pro: false,
  });
  const storageName = client.getModelStorageName();
  await getCactusFileSystem().downloadModel(storageName, url, (p) => {
    if (typeof p === "number" && Number.isFinite(p)) {
      const normalized = p > 1 ? Math.max(0, Math.min(1, p / 100)) : p;
      onProgress?.(normalized);
    }
  });
  client.markAsDownloaded();
}

export async function syncModelStateFromDisk(
  repos: Repositories,
  displayId: string,
  registryAlias: string,
  displayName: string,
): Promise<boolean> {
  const onDisk = await checkModelOnDisk(registryAlias);
  if (onDisk) {
    await repos.modelState.upsert({
      modelId: displayId,
      displayName,
      localAlias: registryAlias,
      downloaded: true,
      downloadProgress: 1,
    });
  }
  return onDisk;
}

export function resolveRegistryAlias(
  displayId: string,
  localAlias: string | null,
): string {
  return localAlias ?? displayIdToRegistryAlias(displayId);
}

export async function switchActiveModelClient(
  config: ActiveModelConfig,
  corpusDir?: string,
): Promise<CactusClient> {
  await disposeCactusClient();
  const client = createClientForModel(
    config.registryAlias,
    config.quantization,
    corpusDir,
  );
  const onDisk = await client.checkModelOnDisk();
  if (onDisk) client.markAsDownloaded();
  return client;
}

export function assertModelInRegistry(
  registryAlias: string | null,
  displayId: string,
): string {
  if (!registryAlias) {
    throw new AppError(
      "cactus/model-not-in-registry",
      `"${displayId}" is not available in the Cactus registry on this device.`,
    );
  }
  return registryAlias;
}
