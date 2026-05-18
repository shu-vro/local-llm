import { NativeSQLite } from "@/native/sqlite";
import { now } from "@/utils/time";

export interface ModelState {
  modelId: string;
  displayName: string;
  localAlias: string | null;
  downloaded: boolean;
  initialized: boolean;
  downloadProgress: number;
  localPath: string | null;
  updatedAt: number;
}

interface ModelRow {
  model_id: string;
  display_name: string;
  local_alias: string | null;
  downloaded: number;
  initialized: number;
  download_progress: number | null;
  local_path: string | null;
  updated_at: number;
}

function mapRow(row: ModelRow): ModelState {
  return {
    modelId: row.model_id,
    displayName: row.display_name,
    localAlias: row.local_alias,
    downloaded: !!row.downloaded,
    initialized: !!row.initialized,
    downloadProgress: row.download_progress ?? 0,
    localPath: row.local_path,
    updatedAt: row.updated_at,
  };
}

export function createModelStateRepo(db: NativeSQLite) {
  async function upsert(state: {
    modelId: string;
    displayName: string;
    localAlias?: string | null;
    downloaded?: boolean;
    initialized?: boolean;
    downloadProgress?: number;
    localPath?: string | null;
  }): Promise<ModelState> {
    const existing = await get(state.modelId);
    const ts = now();
    const next: ModelState = {
      modelId: state.modelId,
      displayName: state.displayName,
      localAlias: state.localAlias ?? existing?.localAlias ?? null,
      downloaded: state.downloaded ?? existing?.downloaded ?? false,
      initialized: state.initialized ?? existing?.initialized ?? false,
      downloadProgress:
        state.downloadProgress ?? existing?.downloadProgress ?? 0,
      localPath: state.localPath ?? existing?.localPath ?? null,
      updatedAt: ts,
    };
    await db.execute(
      `INSERT INTO model_state (model_id, display_name, local_alias, downloaded, initialized, download_progress, local_path, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(model_id) DO UPDATE SET
         display_name = excluded.display_name,
         local_alias = excluded.local_alias,
         downloaded = excluded.downloaded,
         initialized = excluded.initialized,
         download_progress = excluded.download_progress,
         local_path = excluded.local_path,
         updated_at = excluded.updated_at`,
      [
        next.modelId,
        next.displayName,
        next.localAlias,
        next.downloaded ? 1 : 0,
        next.initialized ? 1 : 0,
        next.downloadProgress,
        next.localPath,
        next.updatedAt,
      ],
    );
    return next;
  }

  async function get(modelId: string): Promise<ModelState | null> {
    const row = await db.queryFirst<ModelRow>(
      "SELECT * FROM model_state WHERE model_id = ?",
      [modelId],
    );
    return row ? mapRow(row) : null;
  }

  async function setDownloadProgress(
    modelId: string,
    progress: number,
  ): Promise<void> {
    await db.execute(
      "UPDATE model_state SET download_progress = ?, updated_at = ? WHERE model_id = ?",
      [Math.max(0, Math.min(1, progress)), now(), modelId],
    );
  }

  async function markDownloaded(
    modelId: string,
    localPath?: string | null,
  ): Promise<void> {
    await db.execute(
      "UPDATE model_state SET downloaded = 1, download_progress = 1, local_path = COALESCE(?, local_path), updated_at = ? WHERE model_id = ?",
      [localPath ?? null, now(), modelId],
    );
  }

  async function markInitialized(
    modelId: string,
    initialized: boolean,
  ): Promise<void> {
    await db.execute(
      "UPDATE model_state SET initialized = ?, updated_at = ? WHERE model_id = ?",
      [initialized ? 1 : 0, now(), modelId],
    );
  }

  async function clear(modelId: string): Promise<void> {
    await db.execute(
      `UPDATE model_state SET downloaded = 0, initialized = 0, download_progress = 0, local_path = NULL, updated_at = ?
       WHERE model_id = ?`,
      [now(), modelId],
    );
  }

  async function deleteAll(): Promise<void> {
    await db.execute("DELETE FROM model_state", []);
  }

  return {
    upsert,
    get,
    setDownloadProgress,
    markDownloaded,
    markInitialized,
    clear,
    deleteAll,
  };
}

export type ModelStateRepo = ReturnType<typeof createModelStateRepo>;
