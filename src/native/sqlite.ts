import * as SQLite from "expo-sqlite";

export type SQLParam = string | number | null | boolean | Uint8Array;
export type SQLRow = Record<string, unknown>;

export interface SQLStatement {
  sql: string;
  params?: SQLParam[];
}

export interface NativeSQLite {
  execute(
    sql: string,
    params?: SQLParam[],
  ): Promise<{ changes: number; lastInsertRowId: number }>;
  query<T = SQLRow>(sql: string, params?: SQLParam[]): Promise<T[]>;
  queryFirst<T = SQLRow>(sql: string, params?: SQLParam[]): Promise<T | null>;
  transaction(statements: SQLStatement[]): Promise<void>;
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
  raw(sql: string): Promise<void>;
  close(): Promise<void>;
  readonly handle: SQLite.SQLiteDatabase;
}

function normalizeParams(params?: SQLParam[]): SQLite.SQLiteBindValue[] {
  return (params ?? []).map((p): SQLite.SQLiteBindValue => {
    if (p == null) return null;
    if (typeof p === "boolean") return p ? 1 : 0;
    return p as SQLite.SQLiteBindValue;
  });
}

export async function openNativeSQLite(name: string): Promise<NativeSQLite> {
  const db = await SQLite.openDatabaseAsync(name);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous = NORMAL;
    PRAGMA temp_store = MEMORY;
  `);

  const execute: NativeSQLite["execute"] = async (sql, params) => {
    const result = await db.runAsync(sql, normalizeParams(params));
    return { changes: result.changes, lastInsertRowId: result.lastInsertRowId };
  };

  const query: NativeSQLite["query"] = async <T = SQLRow>(
    sql: string,
    params?: SQLParam[],
  ) => db.getAllAsync(sql, normalizeParams(params)) as Promise<T[]>;

  const queryFirst: NativeSQLite["queryFirst"] = async <T = SQLRow>(
    sql: string,
    params?: SQLParam[],
  ) => db.getFirstAsync(sql, normalizeParams(params)) as Promise<T | null>;

  const transaction: NativeSQLite["transaction"] = async (statements) => {
    await db.withTransactionAsync(async () => {
      for (const stmt of statements) {
        await db.runAsync(stmt.sql, normalizeParams(stmt.params));
      }
    });
  };

  const withTransaction: NativeSQLite["withTransaction"] = async <T>(
    fn: () => Promise<T>,
  ) => {
    let out!: T;
    await db.withTransactionAsync(async () => {
      out = await fn();
    });
    return out;
  };

  const raw = (sql: string) => db.execAsync(sql);
  const close = () => db.closeAsync();

  return {
    execute,
    query,
    queryFirst,
    transaction,
    withTransaction,
    raw,
    close,
    handle: db,
  };
}
