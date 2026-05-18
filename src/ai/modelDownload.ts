import { getRegistry } from "cactus-react-native";
import { Platform } from "react-native";

import { AppError } from "@/utils/errors";

/** Cactus registry URLs use HF revision tags that may 404; weights live on `main`. */
function withMainRevision(url: string): string {
  return url.replace(/\/resolve\/v\d+\.\d+(?:\.\d+)?\//, "/resolve/main/");
}

async function probeDownloadUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok || res.status === 302;
  } catch {
    return false;
  }
}

/**
 * Resolves a working Hugging Face download URL for a Cactus model.
 * The SDK registry pins semver tags (e.g. v1.13) that often 404; we fall back to `main`.
 */
export async function resolveModelDownloadUrl(
  modelAlias: string,
  quantization: "int4" | "int8",
  options: { pro?: boolean } = {},
): Promise<string> {
  const registry = await getRegistry();
  const entry = registry[modelAlias];
  if (!entry) {
    const available = Object.keys(registry).sort().slice(0, 12).join(", ");
    throw new AppError(
      "cactus/model-not-found",
      `Model "${modelAlias}" was not found in the Cactus registry.` +
        (available ? ` Available: ${available}…` : ""),
    );
  }

  const quant = entry.quantization[quantization];
  const preferApple =
    options.pro === true && Platform.OS === "ios" && quant?.pro?.apple;
  const primary = preferApple ? quant?.pro?.apple : quant?.url;

  if (!primary) {
    throw new AppError(
      "cactus/model-quant-missing",
      `Model "${modelAlias}" has no ${quantization} weights in the registry.`,
    );
  }

  const candidates = [...new Set([primary, withMainRevision(primary)])];
  for (const url of candidates) {
    if (await probeDownloadUrl(url)) return url;
  }

  throw new AppError(
    "cactus/download-url-unavailable",
    `Could not reach download URL for "${modelAlias}" (${quantization}). ` +
      `Check your network connection and try again.`,
  );
}
