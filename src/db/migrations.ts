import { NativeSQLite } from "@/native/sqlite";

export interface Migration {
  version: number;
  name: string;
  up: (db: NativeSQLite) => Promise<void>;
}

const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at INTEGER NOT NULL
  );
`;

export const migrations: Migration[] = [
  {
    version: 1,
    name: "initial",
    up: async (db) => {
      await db.raw(`
        CREATE TABLE IF NOT EXISTS threads (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          pinned INTEGER NOT NULL DEFAULT 0,
          archived INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          thread_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('system','user','assistant')),
          content TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL CHECK(status IN ('pending','streaming','complete','failed','cancelled')),
          error TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          parent_message_id TEXT,
          metadata_json TEXT,
          FOREIGN KEY(thread_id) REFERENCES threads(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS attachments (
          id TEXT PRIMARY KEY,
          message_id TEXT NOT NULL,
          thread_id TEXT NOT NULL,
          kind TEXT NOT NULL CHECK(kind IN ('image','audio','video','pdf','document','other')),
          mime_type TEXT,
          filename TEXT,
          local_uri TEXT NOT NULL,
          size_bytes INTEGER,
          extracted_text TEXT,
          processing_status TEXT NOT NULL DEFAULT 'stored',
          created_at INTEGER NOT NULL,
          metadata_json TEXT,
          FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
          FOREIGN KEY(thread_id) REFERENCES threads(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS model_state (
          model_id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          local_alias TEXT,
          downloaded INTEGER NOT NULL DEFAULT 0,
          initialized INTEGER NOT NULL DEFAULT 0,
          download_progress REAL DEFAULT 0,
          local_path TEXT,
          updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_threads_pinned_updated_at ON threads(pinned DESC, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages(thread_id, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);
        CREATE INDEX IF NOT EXISTS idx_attachments_thread ON attachments(thread_id);
      `);
    },
  },
  {
    version: 2,
    name: "multi_model",
    up: async (db) => {
      await db.raw(`ALTER TABLE model_state ADD COLUMN quantization TEXT`);
      await db.raw(`ALTER TABLE model_state ADD COLUMN features_json TEXT`);
      await db.raw(`ALTER TABLE model_state ADD COLUMN provider TEXT`);
      await db.raw(`ALTER TABLE model_state ADD COLUMN size_tier TEXT`);
      await db.execute(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO NOTHING`,
        ["inference.activeModelId", "google/gemma-4-E2B-it"],
      );
    },
  },
];

export async function runMigrations(
  db: NativeSQLite,
): Promise<{ from: number; to: number }> {
  await db.raw(MIGRATIONS_TABLE);
  const row = await db.queryFirst<{ version: number | null }>(
    "SELECT MAX(version) AS version FROM schema_migrations",
  );
  const currentVersion = row?.version ?? 0;
  const pending = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);
  let latest = currentVersion;
  for (const m of pending) {
    await db.withTransaction(async () => {
      await m.up(db);
      await db.execute(
        "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
        [m.version, m.name, Date.now()],
      );
    });
    latest = m.version;
  }
  return { from: currentVersion, to: latest };
}
