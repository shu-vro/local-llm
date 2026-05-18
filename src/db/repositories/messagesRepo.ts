import { NativeSQLite } from "@/native/sqlite";
import { messageId as newMessageId } from "@/utils/ids";
import { safeParse, safeStringify } from "@/utils/json";
import { now } from "@/utils/time";

export type MessageRole = "system" | "user" | "assistant";
export type MessageStatus =
  | "pending"
  | "streaming"
  | "complete"
  | "failed"
  | "cancelled";

export interface Message {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  error: string | null;
  createdAt: number;
  updatedAt: number;
  parentMessageId: string | null;
  metadata: Record<string, unknown>;
}

interface MessageRow {
  id: string;
  thread_id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  error: string | null;
  created_at: number;
  updated_at: number;
  parent_message_id: string | null;
  metadata_json: string | null;
}

function mapRow(row: MessageRow): Message {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    status: row.status,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parentMessageId: row.parent_message_id,
    metadata: safeParse<Record<string, unknown>>(row.metadata_json, {}),
  };
}

export interface CreateMessageInput {
  id?: string;
  threadId: string;
  role: MessageRole;
  content?: string;
  status?: MessageStatus;
  parentMessageId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ListMessagesOptions {
  limit?: number;
  beforeCreatedAt?: number;
  afterCreatedAt?: number;
}

export function createMessagesRepo(db: NativeSQLite) {
  async function create(input: CreateMessageInput): Promise<Message> {
    const ts = now();
    const id = input.id ?? newMessageId();
    const content = input.content ?? "";
    const status: MessageStatus = input.status ?? "complete";
    const metadata = safeStringify(input.metadata ?? {});
    await db.execute(
      `INSERT INTO messages (id, thread_id, role, content, status, error, created_at, updated_at, parent_message_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      [
        id,
        input.threadId,
        input.role,
        content,
        status,
        ts,
        ts,
        input.parentMessageId ?? null,
        metadata,
      ],
    );
    return {
      id,
      threadId: input.threadId,
      role: input.role,
      content,
      status,
      error: null,
      createdAt: ts,
      updatedAt: ts,
      parentMessageId: input.parentMessageId ?? null,
      metadata: input.metadata ?? {},
    };
  }

  async function getById(id: string): Promise<Message | null> {
    const row = await db.queryFirst<MessageRow>(
      "SELECT * FROM messages WHERE id = ?",
      [id],
    );
    return row ? mapRow(row) : null;
  }

  async function listForThread(
    threadId: string,
    opts: ListMessagesOptions = {},
  ): Promise<Message[]> {
    const limit = Math.max(1, Math.min(opts.limit ?? 100, 500));
    const conds: string[] = ["thread_id = ?"];
    const params: (string | number)[] = [threadId];
    if (typeof opts.beforeCreatedAt === "number") {
      conds.push("created_at < ?");
      params.push(opts.beforeCreatedAt);
    }
    if (typeof opts.afterCreatedAt === "number") {
      conds.push("created_at > ?");
      params.push(opts.afterCreatedAt);
    }
    const where = `WHERE ${conds.join(" AND ")}`;
    const sql = `SELECT * FROM messages ${where} ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);
    const rows = await db.query<MessageRow>(sql, params);
    return rows.map(mapRow).reverse();
  }

  async function listRecentContext(
    threadId: string,
    n: number,
  ): Promise<Message[]> {
    const rows = await db.query<MessageRow>(
      `SELECT * FROM messages
       WHERE thread_id = ? AND status IN ('complete','streaming')
       ORDER BY created_at DESC LIMIT ?`,
      [threadId, Math.max(1, Math.min(n, 200))],
    );
    return rows.map(mapRow).reverse();
  }

  async function updateContent(
    id: string,
    content: string,
    status: MessageStatus = "streaming",
  ): Promise<void> {
    await db.execute(
      "UPDATE messages SET content = ?, status = ?, updated_at = ? WHERE id = ?",
      [content, status, now(), id],
    );
  }

  async function appendStreaming(id: string, chunk: string): Promise<void> {
    if (!chunk) return;
    await db.execute(
      "UPDATE messages SET content = content || ?, status = ?, updated_at = ? WHERE id = ?",
      [chunk, "streaming", now(), id],
    );
  }

  async function finalize(
    id: string,
    status: MessageStatus,
    options: {
      error?: string | null;
      content?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<void> {
    const ts = now();
    if (options.content != null) {
      if (options.metadata !== undefined) {
        await db.execute(
          "UPDATE messages SET content = ?, status = ?, error = ?, updated_at = ?, metadata_json = ? WHERE id = ?",
          [
            options.content,
            status,
            options.error ?? null,
            ts,
            safeStringify(options.metadata),
            id,
          ],
        );
      } else {
        await db.execute(
          "UPDATE messages SET content = ?, status = ?, error = ?, updated_at = ? WHERE id = ?",
          [options.content, status, options.error ?? null, ts, id],
        );
      }
    } else if (options.metadata !== undefined) {
      await db.execute(
        "UPDATE messages SET status = ?, error = ?, updated_at = ?, metadata_json = ? WHERE id = ?",
        [
          status,
          options.error ?? null,
          ts,
          safeStringify(options.metadata),
          id,
        ],
      );
    } else {
      await db.execute(
        "UPDATE messages SET status = ?, error = ?, updated_at = ? WHERE id = ?",
        [status, options.error ?? null, ts, id],
      );
    }
  }

  async function remove(id: string): Promise<void> {
    await db.execute("DELETE FROM messages WHERE id = ?", [id]);
  }

  async function deleteAfter(
    threadId: string,
    createdAt: number,
    includeAt = false,
  ): Promise<void> {
    const op = includeAt ? ">=" : ">";
    await db.execute(
      `DELETE FROM messages WHERE thread_id = ? AND created_at ${op} ?`,
      [threadId, createdAt],
    );
  }

  async function countForThread(threadId: string): Promise<number> {
    const row = await db.queryFirst<{ c: number }>(
      "SELECT COUNT(*) AS c FROM messages WHERE thread_id = ?",
      [threadId],
    );
    return row?.c ?? 0;
  }

  async function firstUserMessage(threadId: string): Promise<Message | null> {
    const row = await db.queryFirst<MessageRow>(
      `SELECT * FROM messages WHERE thread_id = ? AND role = 'user' ORDER BY created_at ASC LIMIT 1`,
      [threadId],
    );
    return row ? mapRow(row) : null;
  }

  return {
    create,
    getById,
    listForThread,
    listRecentContext,
    updateContent,
    appendStreaming,
    finalize,
    remove,
    deleteAfter,
    countForThread,
    firstUserMessage,
  };
}

export type MessagesRepo = ReturnType<typeof createMessagesRepo>;
