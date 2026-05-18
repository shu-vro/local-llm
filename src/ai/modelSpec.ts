import type { ModelQuantization } from "@/ai/models";

export type SizeTier = "tiny" | "small" | "medium" | "large";

export interface ModelSizeSpec {
  paramsMillions: number | null;
  paramsLabel: string;
  sizeTier: SizeTier;
  downloadMbInt4: number | null;
  downloadMbInt8: number | null;
  contextHint: string | null;
}

const PARAM_PATTERNS: { re: RegExp; scale: number }[] = [
  { re: /(\d+(?:\.\d+)?)\s*b(?:illion)?/i, scale: 1000 },
  { re: /e2b/i, scale: 2000 },
  { re: /e4b/i, scale: 4000 },
  { re: /(\d+(?:\.\d+)?)\s*m(?:illion)?/i, scale: 1 },
  { re: /(\d+(?:\.\d+)?)\s*k/i, scale: 0.001 },
  { re: /-(\d+(?:\.\d+)?)b-/i, scale: 1000 },
  { re: /-(\d+(?:\.\d+)?)b$/i, scale: 1000 },
  { re: /-(\d+(?:\.\d+)?)b-it/i, scale: 1000 },
  { re: /(\d+(?:\.\d+)?)b-a\d+b/i, scale: 1000 }, // 8B-A1B MoE → use 1500 active
];

function formatParams(millions: number): string {
  if (millions >= 1000) {
    const b = millions / 1000;
    return b >= 10 ? `~${Math.round(b)}B` : `~${b.toFixed(1)}B`;
  }
  if (millions >= 1) return `~${Math.round(millions)}M`;
  return `~${(millions * 1000).toFixed(0)}K`;
}

function tierFromParams(millions: number | null): SizeTier {
  if (millions == null) return "medium";
  if (millions < 500) return "tiny";
  if (millions < 1200) return "small";
  if (millions < 3500) return "medium";
  return "large";
}

/** Rough on-disk size for Cactus INT4/INT8 weights (not exact). */
function estimateDownloadMb(
  paramsMillions: number,
  quant: ModelQuantization,
): number {
  const paramsB = paramsMillions / 1000;
  const mbPerB = quant === "int4" ? 520 : 980;
  return Math.max(40, Math.round(paramsB * mbPerB));
}

function parseParamsFromText(
  modelId: string,
  description: string,
): number | null {
  const hay = `${modelId} ${description}`;
  for (const { re, scale } of PARAM_PATTERNS) {
    const m = hay.match(re);
    if (!m) continue;
    if (/e2b/i.test(m[0])) return 2000;
    if (/e4b/i.test(m[0])) return 4000;
    const n = parseFloat(m[1] ?? "");
    if (Number.isFinite(n)) {
      if (/8b-a1b/i.test(hay)) return 1500;
      return n * scale;
    }
  }
  if (/e2b/i.test(hay)) return 2000;
  if (/e4b/i.test(hay)) return 4000;
  if (/gemma-3n-e2b/i.test(hay)) return 2000;
  if (/gemma-3n-e4b/i.test(hay)) return 4000;
  if (/youtu-llm-2b/i.test(hay)) return 1960;
  if (/0\.6b/i.test(hay)) return 600;
  if (/1\.1b/i.test(hay)) return 1100;
  return null;
}

export function inferModelSizeSpec(
  modelId: string,
  description: string,
): ModelSizeSpec {
  const paramsMillions = parseParamsFromText(modelId, description);
  const paramsLabel =
    paramsMillions != null ? formatParams(paramsMillions) : "Unknown";
  const sizeTier = tierFromParams(paramsMillions);
  const downloadMbInt4 =
    paramsMillions != null ? estimateDownloadMb(paramsMillions, "int4") : null;
  const downloadMbInt8 =
    paramsMillions != null ? estimateDownloadMb(paramsMillions, "int8") : null;

  let contextHint: string | null = null;
  if (/128k/i.test(description)) contextHint = "128K context";
  else if (paramsMillions != null && paramsMillions >= 1500)
    contextHint = "Long context (model-dependent)";

  return {
    paramsMillions,
    paramsLabel,
    sizeTier,
    downloadMbInt4,
    downloadMbInt8,
    contextHint,
  };
}

export function formatDownloadSize(mb: number | null): string {
  if (mb == null) return "—";
  if (mb >= 1024) return `~${(mb / 1024).toFixed(1)} GB`;
  return `~${mb} MB`;
}

export function sizeTierLabel(tier: SizeTier): string {
  switch (tier) {
    case "tiny":
      return "Tiny";
    case "small":
      return "Small";
    case "medium":
      return "Medium";
    case "large":
      return "Large";
  }
}
