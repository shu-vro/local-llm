import { NativeSQLite } from "@/native/sqlite";
import { attachmentId as newAttachmentId } from "@/utils/ids";
import { safeParse, safeStringify } from "@/utils/json";
import { now } from "@/utils/time";

export type AttachmentKind =
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "document"
  | "other";
export type AttachmentProcessingStatus =
  | "stored"
  | "ready"
  | "extracted"
  | "unsupported"
  | "failed";

export interface Attachment {
  id: string;
  messageId: string;
  threadId: string;
  kind: AttachmentKind;
  mimeType: string | null;
  filename: string | null;
  localUri: string;
  sizeBytes: number | null;
  extractedText: string | null;
  processingStatus: AttachmentProcessingStatus;
  createdAt: number;
  metadata: Record<string, unknown>;
}

interface AttachmentRow {
  id: string;
  message_id: string;
  thread_id: string;
  kind: AttachmentKind;
  mime_type: string | null;
  filename: string | null;
  local_uri: string;
  size_bytes: number | null;
  extracted_text: string | null;
  processing_status: AttachmentProcessingStatus;
  created_at: number;
  metadata_json: string | null;
}

function mapRow(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    messageId: row.message_id,
    threadId: row.thread_id,
    kind: row.kind,
    mimeType: row.mime_type,
    filename: row.filename,
    localUri: row.local_uri,
    sizeBytes: row.size_bytes,
    extractedText: row.extracted_text,
    processingStatus: row.processing_status,
    createdAt: row.created_at,
    metadata: safeParse<Record<string, unknown>>(row.metadata_json, {}),
  };
}

export interface CreateAttachmentInput {
  id?: string;
  messageId: string;
  threadId: string;
  kind: AttachmentKind;
  mimeType?: string | null;
  filename?: string | null;
  localUri: string;
  sizeBytes?: number | null;
  extractedText?: string | null;
  processingStatus?: AttachmentProcessingStatus;
  metadata?: Record<string, unknown>;
}

export function createAttachmentsRepo(db: NativeSQLite) {
  async function create(input: CreateAttachmentInput): Promise<Attachment> {
    const ts = now();
    const id = input.id ?? newAttachmentId();
    const metadata = safeStringify(input.metadata ?? {});
    await db.execute(
      `INSERT INTO attachments
        (id, message_id, thread_id, kind, mime_type, filename, local_uri, size_bytes, extracted_text, processing_status, created_at, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.messageId,
        input.threadId,
        input.kind,
        input.mimeType ?? null,
        input.filename ?? null,
        input.localUri,
        input.sizeBytes ?? null,
        input.extractedText ?? null,
        input.processingStatus ?? "stored",
        ts,
        metadata,
      ],
    );
    return {
      id,
      messageId: input.messageId,
      threadId: input.threadId,
      kind: input.kind,
      mimeType: input.mimeType ?? null,
      filename: input.filename ?? null,
      localUri: input.localUri,
      sizeBytes: input.sizeBytes ?? null,
      extractedText: input.extractedText ?? null,
      processingStatus: input.processingStatus ?? "stored",
      createdAt: ts,
      metadata: input.metadata ?? {},
    };
  }

  async function listForMessage(messageId: string): Promise<Attachment[]> {
    const rows = await db.query<AttachmentRow>(
      "SELECT * FROM attachments WHERE message_id = ? ORDER BY created_at ASC",
      [messageId],
    );
    return rows.map(mapRow);
  }

  async function listForThread(threadId: string): Promise<Attachment[]> {
    const rows = await db.query<AttachmentRow>(
      "SELECT * FROM attachments WHERE thread_id = ? ORDER BY created_at ASC",
      [threadId],
    );
    return rows.map(mapRow);
  }

  async function remove(id: string): Promise<void> {
    await db.execute("DELETE FROM attachments WHERE id = ?", [id]);
  }

  async function setExtractedText(
    id: string,
    text: string,
    status: AttachmentProcessingStatus,
  ): Promise<void> {
    await db.execute(
      "UPDATE attachments SET extracted_text = ?, processing_status = ? WHERE id = ?",
      [text, status, id],
    );
  }

  return { create, listForMessage, listForThread, remove, setExtractedText };
}

export type AttachmentsRepo = ReturnType<typeof createAttachmentsRepo>;
