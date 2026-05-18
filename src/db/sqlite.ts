import { NativeSQLite, openNativeSQLite } from "@/native/sqlite";

import { runMigrations } from "./migrations";

const DB_NAME = "local-llm.db";

let cached: Promise<NativeSQLite> | null = null;

export async function openAppDatabase(): Promise<NativeSQLite> {
  if (!cached) {
    cached = (async () => {
      const db = await openNativeSQLite(DB_NAME);
      await runMigrations(db);
      return db;
    })();
  }
  return cached;
}

export async function resetAppDatabaseInstance(): Promise<void> {
  if (!cached) return;
  try {
    const db = await cached;
    await db.close();
  } catch {
    // Closing a database that is mid-operation can race; we still want to clear the cache.
  }
  cached = null;
}
