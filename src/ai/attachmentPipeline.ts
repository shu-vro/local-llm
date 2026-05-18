import {
  AttachmentKind,
  AttachmentProcessingStatus,
} from "@/db/repositories/attachmentsRepo";
import { copyToAttachments, deleteFile } from "@/native/fileStore";
import { attachmentId as newAttachmentId } from "@/utils/ids";

export interface AttachmentSource {
  uri: string;
  filename?: string | null;
  mimeType?: string | null;
  size?: number | null;
}

export interface PreparedAttachment {
  id: string;
  kind: AttachmentKind;
  mimeType: string | null;
  filename: string | null;
  localUri: string;
  sizeBytes: number | null;
  processingStatus: AttachmentProcessingStatus;
  unsupportedReason?: string;
}

export const SUPPORTED_KINDS: ReadonlyArray<AttachmentKind> = [
  "image",
  "audio",
  "video",
  "pdf",
  "document",
  "other",
];

const IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".heic",
  ".heif",
  ".bmp",
]);
const AUDIO_EXTS = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".flac",
  ".opus",
]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"]);
const DOC_EXTS = new Set([
  ".txt",
  ".md",
  ".rtf",
  ".csv",
  ".json",
  ".yaml",
  ".yml",
]);

function lowerExt(filename: string | null | undefined, uri: string): string {
  const name = filename ?? uri;
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

export function detectKind(
  mimeType: string | null | undefined,
  filename: string | null | undefined,
  uri: string,
): AttachmentKind {
  const m = (mimeType ?? "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";
  if (m === "application/pdf") return "pdf";
  const ext = lowerExt(filename, uri);
  if (IMAGE_EXTS.has(ext)) return "image";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (ext === ".pdf") return "pdf";
  if (DOC_EXTS.has(ext)) return "document";
  return "other";
}

function unsupportedReasonFor(kind: AttachmentKind): string | undefined {
  switch (kind) {
    case "audio":
      return "Audio understanding is disabled in this build.";
    case "video":
      return "Video understanding is not supported in this build.";
    case "pdf":
      return "PDF text extraction is not available in this local build.";
    case "document":
      return "Document text extraction is not available in this local build.";
    case "other":
      return "This file type is not supported by the local model.";
    case "image":
    default:
      return undefined;
  }
}

export interface PrepareAttachmentParams {
  source: AttachmentSource;
  threadId: string;
}

export function prepareAttachment({
  source,
  threadId,
}: PrepareAttachmentParams): PreparedAttachment {
  const id = newAttachmentId();
  const kind = detectKind(source.mimeType, source.filename, source.uri);
  const imageMime =
    kind === "image" ? (source.mimeType ?? "image/jpeg") : source.mimeType;
  const stored = copyToAttachments({
    sourceUri: source.uri,
    threadId,
    attachmentId: id,
    filename: source.filename ?? undefined,
    mimeType: imageMime ?? undefined,
  });
  const unsupportedReason = unsupportedReasonFor(kind);
  const processingStatus: AttachmentProcessingStatus =
    kind === "image" ? "ready" : unsupportedReason ? "unsupported" : "stored";
  return {
    id,
    kind,
    mimeType: imageMime ?? stored.mimeType ?? null,
    filename: source.filename ?? stored.filename,
    localUri: stored.uri,
    sizeBytes: source.size ?? stored.size ?? null,
    processingStatus,
    unsupportedReason,
  };
}

export function discardPreparedAttachment(p: PreparedAttachment): void {
  deleteFile(p.localUri);
}
