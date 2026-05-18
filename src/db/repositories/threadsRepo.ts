import { NativeSQLite } from "@/native/sqlite";
import { newId, threadId as newThreadId } from "@/utils/ids";
import { now } from "@/utils/time";

export interface Thread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  archived: boolean;
}

export interface ThreadWithPreview extends Thread {
  lastMessagePreview: string | null;
  lastMessageRole: "system" | "user" | "assistant" | null;
  messageCount: number;
}

interface ThreadRow {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  pinned: number;
  archived: number;
}

interface ThreadPreviewRow extends ThreadRow {
  last_preview: string | null;
  last_role: "system" | "user" | "assistant" | null;
  message_count: number;
}

function mapRow(row: ThreadRow): Thread {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pinned: !!row.pinned,
    archived: !!row.archived,
  };
}

function mapPreviewRow(row: ThreadPreviewRow): ThreadWithPreview {
  return {
    ...mapRow(row),
    lastMessagePreview: row.last_preview,
    lastMessageRole: row.last_role,
    messageCount: row.message_count,
  };
}

export interface ListThreadsOptions {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  search?: string;
}

export function createThreadsRepo(db: NativeSQLite) {
  async function create(input?: {
    id?: string;
    title?: string;
  }): Promise<Thread> {
    const ts = now();
    const id = input?.id ?? newThreadId();
    const title = (input?.title ?? "New chat").trim() || "New chat";
    await db.execute(
      `INSERT INTO threads (id, title, created_at, updated_at, pinned, archived)
       VALUES (?, ?, ?, ?, 0, 0)`,
      [id, title, ts, ts],
    );
    return {
      id,
      title,
      createdAt: ts,
      updatedAt: ts,
      pinned: false,
      archived: false,
    };
  }

  async function getById(id: string): Promise<Thread | null> {
    const row = await db.queryFirst<ThreadRow>(
      "SELECT * FROM threads WHERE id = ?",
      [id],
    );
    return row ? mapRow(row) : null;
  }

  async function list(
    opts: ListThreadsOptions = {},
  ): Promise<ThreadWithPreview[]> {
    const limit = Math.max(1, Math.min(opts.limit ?? 50, 200));
    const offset = Math.max(0, opts.offset ?? 0);

    const conds: string[] = [];
    const params: (string | number)[] = [];
    if (!opts.includeArchived) conds.push("t.archived = 0");
    if (opts.search && opts.search.trim()) {
      conds.push("t.title LIKE ?");
      params.push(`%${opts.search.trim()}%`);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const sql = `
      SELECT
        t.*,
        (
          SELECT content FROM messages m
          WHERE m.thread_id = t.id
          ORDER BY m.created_at DESC LIMIT 1
        ) AS last_preview,
        (
          SELECT role FROM messages m
          WHERE m.thread_id = t.id
          ORDER BY m.created_at DESC LIMIT 1
        ) AS last_role,
        (
          SELECT COUNT(*) FROM messages m WHERE m.thread_id = t.id
        ) AS message_count
      FROM threads t
      ${where}
      ORDER BY t.pinned DESC, t.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);
    const rows = await db.query<ThreadPreviewRow>(sql, params);
    return rows.map(mapPreviewRow);
  }

  async function rename(id: string, title: string): Promise<void> {
    const clean = title.trim().slice(0, 200) || "New chat";
    await db.execute(
      "UPDATE threads SET title = ?, updated_at = ? WHERE id = ?",
      [clean, now(), id],
    );
  }

  async function setPinned(id: string, pinned: boolean): Promise<void> {
    await db.execute(
      "UPDATE threads SET pinned = ?, updated_at = ? WHERE id = ?",
      [pinned ? 1 : 0, now(), id],
    );
  }

  async function setArchived(id: string, archived: boolean): Promise<void> {
    await db.execute(
      "UPDATE threads SET archived = ?, updated_at = ? WHERE id = ?",
      [archived ? 1 : 0, now(), id],
    );
  }

  async function touch(id: string): Promise<void> {
    await db.execute("UPDATE threads SET updated_at = ? WHERE id = ?", [
      now(),
      id,
    ]);
  }

  async function remove(id: string): Promise<void> {
    await db.execute("DELETE FROM threads WHERE id = ?", [id]);
  }

  async function deleteAll(): Promise<void> {
    await db.execute("DELETE FROM threads", []);
  }

  async function totalCount(): Promise<number> {
    const row = await db.queryFirst<{ c: number }>(
      "SELECT COUNT(*) AS c FROM threads",
    );
    return row?.c ?? 0;
  }

  return {
    create,
    getById,
    list,
    rename,
    setPinned,
    setArchived,
    touch,
    remove,
    deleteAll,
    totalCount,
    _newId: () => newId("thr"),
  };
}

export type ThreadsRepo = ReturnType<typeof createThreadsRepo>;
