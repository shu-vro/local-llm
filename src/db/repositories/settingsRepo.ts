import { NativeSQLite } from "@/native/sqlite";

import { DEFAULT_MODEL_DISPLAY_ID } from "@/ai/models";

export interface AppSettings {
  activeModelId: string;
  contextMessageLimit: number;
  maxContextTokens: number;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  themePreference: "system" | "light" | "dark";
}

export const DEFAULT_SETTINGS: AppSettings = {
  activeModelId: DEFAULT_MODEL_DISPLAY_ID,
  contextMessageLimit: 16,
  maxContextTokens: 8192,
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxTokens: 512,
  themePreference: "system",
};

export const SETTINGS_KEYS = {
  activeModelId: "inference.activeModelId",
  contextMessageLimit: "inference.contextMessageLimit",
  maxContextTokens: "inference.maxContextTokens",
  temperature: "inference.temperature",
  topP: "inference.topP",
  topK: "inference.topK",
  maxTokens: "inference.maxTokens",
  themePreference: "theme.preference",
} as const;

function parseNumber(value: string | null, fallback: number): number {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function createSettingsRepo(db: NativeSQLite) {
  async function get(key: string): Promise<string | null> {
    const row = await db.queryFirst<{ value: string }>(
      "SELECT value FROM settings WHERE key = ?",
      [key],
    );
    return row?.value ?? null;
  }

  async function set(key: string, value: string): Promise<void> {
    await db.execute(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  }

  async function remove(key: string): Promise<void> {
    await db.execute("DELETE FROM settings WHERE key = ?", [key]);
  }

  async function getAll(): Promise<AppSettings> {
    const rows = await db.query<{ key: string; value: string }>(
      "SELECT key, value FROM settings",
    );
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const themePref = map.get(SETTINGS_KEYS.themePreference);
    const activeModelRaw = map.get(SETTINGS_KEYS.activeModelId);
    return {
      activeModelId:
        activeModelRaw && activeModelRaw.length > 0
          ? activeModelRaw
          : DEFAULT_SETTINGS.activeModelId,
      contextMessageLimit: Math.max(
        2,
        Math.min(
          64,
          Math.round(
            parseNumber(
              map.get(SETTINGS_KEYS.contextMessageLimit) ?? null,
              DEFAULT_SETTINGS.contextMessageLimit,
            ),
          ),
        ),
      ),
      maxContextTokens: Math.max(
        1024,
        Math.min(
          32768,
          Math.round(
            parseNumber(
              map.get(SETTINGS_KEYS.maxContextTokens) ?? null,
              DEFAULT_SETTINGS.maxContextTokens,
            ),
          ),
        ),
      ),
      temperature: Math.max(
        0,
        Math.min(
          2,
          parseNumber(
            map.get(SETTINGS_KEYS.temperature) ?? null,
            DEFAULT_SETTINGS.temperature,
          ),
        ),
      ),
      topP: Math.max(
        0,
        Math.min(
          1,
          parseNumber(
            map.get(SETTINGS_KEYS.topP) ?? null,
            DEFAULT_SETTINGS.topP,
          ),
        ),
      ),
      topK: Math.max(
        1,
        Math.min(
          200,
          Math.round(
            parseNumber(
              map.get(SETTINGS_KEYS.topK) ?? null,
              DEFAULT_SETTINGS.topK,
            ),
          ),
        ),
      ),
      maxTokens: Math.max(
        32,
        Math.min(
          4096,
          Math.round(
            parseNumber(
              map.get(SETTINGS_KEYS.maxTokens) ?? null,
              DEFAULT_SETTINGS.maxTokens,
            ),
          ),
        ),
      ),
      themePreference:
        themePref === "light" || themePref === "dark" || themePref === "system"
          ? themePref
          : DEFAULT_SETTINGS.themePreference,
    };
  }

  async function update(partial: Partial<AppSettings>): Promise<void> {
    const entries: [string, string][] = [];
    if (partial.activeModelId != null)
      entries.push([SETTINGS_KEYS.activeModelId, partial.activeModelId]);
    if (partial.contextMessageLimit != null)
      entries.push([
        SETTINGS_KEYS.contextMessageLimit,
        String(partial.contextMessageLimit),
      ]);
    if (partial.maxContextTokens != null)
      entries.push([
        SETTINGS_KEYS.maxContextTokens,
        String(partial.maxContextTokens),
      ]);
    if (partial.temperature != null)
      entries.push([SETTINGS_KEYS.temperature, String(partial.temperature)]);
    if (partial.topP != null)
      entries.push([SETTINGS_KEYS.topP, String(partial.topP)]);
    if (partial.topK != null)
      entries.push([SETTINGS_KEYS.topK, String(partial.topK)]);
    if (partial.maxTokens != null)
      entries.push([SETTINGS_KEYS.maxTokens, String(partial.maxTokens)]);
    if (partial.themePreference != null)
      entries.push([SETTINGS_KEYS.themePreference, partial.themePreference]);

    await db.withTransaction(async () => {
      for (const [k, v] of entries) await set(k, v);
    });
  }

  async function deleteAll(): Promise<void> {
    await db.execute("DELETE FROM settings", []);
  }

  return { get, set, remove, getAll, update, deleteAll };
}

export type SettingsRepo = ReturnType<typeof createSettingsRepo>;
