import {
  CactusLM,
  getRegistry,
  type CactusLMCompleteOptions,
  type CactusLMCompleteParams,
  type CactusLMCompleteResult,
  type CactusLMMessage,
  type CactusLMRagQueryChunk,
} from "cactus-react-native";

import { getCactusFileSystem } from "@/ai/cactusNative";
import { resolveModelDownloadUrl } from "@/ai/modelDownload";
import { MODEL_ALIAS, MODEL_DISPLAY_NAME } from "@/theme";
import { AppError } from "@/utils/errors";

function normalizeProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return Math.max(0, Math.min(1, value / 100));
  return Math.max(0, Math.min(1, value));
}

export const MODEL_ID = MODEL_ALIAS;
export const MODEL_DISPLAY = MODEL_DISPLAY_NAME;

export interface CactusInferenceOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface CactusCompleteRequest {
  messages: CactusLMMessage[];
  options?: CactusInferenceOptions;
  onToken?: (token: string) => void;
  audio?: number[];
  signal?: AbortSignal;
}

export type { CactusLMCompleteResult, CactusLMMessage, CactusLMRagQueryChunk };

/**
 * Privacy defaults forced on every call so cloud handoff and telemetry can never
 * be re-enabled from a caller. `confidenceThreshold: 0` means the local model's
 * confidence is always >= threshold, so the handoff branch never fires.
 */
const PRIVACY_DEFAULTS: CactusLMCompleteOptions = {
  telemetryEnabled: false,
  confidenceThreshold: 0,
};

export interface CactusClientConfig {
  modelAlias?: string;
  corpusDir?: string;
  quantization?: "int4" | "int8";
}

export class CactusClient {
  private lm: CactusLM;
  private readonly modelAlias: string;
  private readonly quantization: "int4" | "int8";
  private corpusDir: string | undefined;
  private initialized = false;
  private downloaded = false;
  private generating = false;
  private downloading = false;
  private currentSignal: AbortSignal | null = null;
  private currentSignalListener: (() => void) | null = null;

  constructor(config: CactusClientConfig = {}) {
    this.modelAlias = config.modelAlias ?? MODEL_ALIAS;
    this.quantization = config.quantization ?? "int8";
    this.corpusDir = config.corpusDir;
    this.lm = new CactusLM({
      model: this.modelAlias,
      corpusDir: this.corpusDir,
      options: { quantization: this.quantization, pro: false },
    });
  }

  get modelId(): string {
    return this.modelAlias;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get isDownloaded(): boolean {
    return this.downloaded;
  }

  get isGenerating(): boolean {
    return this.generating;
  }

  get isDownloading(): boolean {
    return this.downloading;
  }

  getModelStorageName(): string {
    return this.lm.getModelName();
  }

  markAsDownloaded(): void {
    this.downloaded = true;
  }

  async checkModelOnDisk(): Promise<boolean> {
    try {
      return await getCactusFileSystem().modelExists(
        this.getModelStorageName(),
      );
    } catch (err) {
      if (__DEV__) console.warn("[CactusClient] checkModelOnDisk failed:", err);
      return false;
    }
  }

  async ensureModelInRegistry(): Promise<void> {
    const registry = await getRegistry();
    const entry = registry[this.modelAlias];
    const quant = entry?.quantization?.[this.quantization];
    if (!quant?.url && !quant?.pro?.apple) {
      const available = Object.keys(registry).sort().slice(0, 12).join(", ");
      throw new AppError(
        "cactus/model-not-found",
        `Model "${this.modelAlias}" (${this.quantization}) was not found in the Cactus registry. ` +
          `Check your network connection and try again. ` +
          (available
            ? `Available models include: ${available}…`
            : "The registry could not be loaded."),
      );
    }
  }

  async download(onProgress?: (progress: number) => void): Promise<void> {
    if (this.downloading) {
      throw new AppError(
        "cactus/already-downloading",
        "Model download is already in progress.",
      );
    }

    const onDisk = await this.checkModelOnDisk();
    if (onDisk) {
      this.downloaded = true;
      onProgress?.(1);
      return;
    }

    await this.ensureModelInRegistry();

    this.downloading = true;
    try {
      const url = await resolveModelDownloadUrl(
        this.modelAlias,
        this.quantization,
        {
          pro: false,
        },
      );
      const storageName = this.getModelStorageName();
      await getCactusFileSystem().downloadModel(
        storageName,
        url,
        (p: number) => {
          if (typeof p === "number" && Number.isFinite(p)) {
            onProgress?.(normalizeProgress(p));
          }
        },
      );
      this.downloaded = true;
    } finally {
      this.downloading = false;
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.lm.init();
    this.initialized = true;
  }

  async setCorpusDir(dir: string | undefined): Promise<void> {
    if (this.corpusDir === dir) return;
    await this.destroy();
    this.corpusDir = dir;
    this.lm = new CactusLM({
      model: this.modelAlias,
      corpusDir: this.corpusDir,
      options: { quantization: this.quantization, pro: false },
    });
    this.initialized = false;
    this.downloaded = true;
  }

  async complete(
    request: CactusCompleteRequest,
  ): Promise<CactusLMCompleteResult> {
    if (this.generating) {
      throw new AppError(
        "cactus/already-generating",
        "A generation is already in progress; stop it before starting another.",
      );
    }
    if (!this.downloaded) {
      throw new AppError(
        "cactus/model-not-downloaded",
        "The local model has not been downloaded yet. Download it from the model screen first.",
      );
    }

    const options: CactusLMCompleteOptions = {
      ...PRIVACY_DEFAULTS,
      temperature: request.options?.temperature,
      topP: request.options?.topP,
      topK: request.options?.topK,
      maxTokens: request.options?.maxTokens,
      stopSequences: request.options?.stopSequences,
      useVad: false,
    };

    const params: CactusLMCompleteParams = {
      messages: request.messages,
      options,
      onToken: request.onToken,
    };
    if (request.audio) params.audio = request.audio;

    this.generating = true;
    if (request.signal) {
      this.currentSignal = request.signal;
      this.currentSignalListener = () => {
        void this.stop().catch(() => undefined);
      };
      if (request.signal.aborted) {
        this.currentSignalListener();
      } else {
        request.signal.addEventListener("abort", this.currentSignalListener);
      }
    }
    try {
      const result = await this.lm.complete(params);
      if (result?.cloudHandoff) {
        if (__DEV__) {
          console.warn(
            "[CactusClient] result.cloudHandoff was true; this build forces local-only, treating as local response.",
          );
        }
      }
      return result;
    } finally {
      this.generating = false;
      this.clearSignal();
    }
  }

  async stop(): Promise<void> {
    try {
      await this.lm.stop();
    } catch (err) {
      if (__DEV__) console.warn("[CactusClient] stop failed:", err);
    }
  }

  async reset(): Promise<void> {
    try {
      await this.lm.reset();
    } catch (err) {
      if (__DEV__) console.warn("[CactusClient] reset failed:", err);
    }
  }

  async ragQuery(query: string, topK = 5): Promise<CactusLMRagQueryChunk[]> {
    if (!this.corpusDir) return [];
    if (!this.downloaded) return [];
    try {
      const result = await this.lm.ragQuery({ query, topK });
      return result?.chunks ?? [];
    } catch (err) {
      if (__DEV__) console.warn("[CactusClient] ragQuery failed:", err);
      return [];
    }
  }

  async destroy(): Promise<void> {
    this.clearSignal();
    try {
      await this.lm.destroy();
    } catch (err) {
      if (__DEV__) console.warn("[CactusClient] destroy failed:", err);
    }
    this.initialized = false;
    this.generating = false;
  }

  private clearSignal(): void {
    if (this.currentSignal && this.currentSignalListener) {
      this.currentSignal.removeEventListener(
        "abort",
        this.currentSignalListener,
      );
    }
    this.currentSignal = null;
    this.currentSignalListener = null;
  }
}

let singleton: CactusClient | null = null;

export function getCactusClient(): CactusClient {
  if (!singleton) singleton = new CactusClient();
  return singleton;
}

export async function disposeCactusClient(): Promise<void> {
  if (!singleton) return;
  await singleton.destroy();
  singleton = null;
}
