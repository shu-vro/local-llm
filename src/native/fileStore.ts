import { Directory, File, Paths } from "expo-file-system";

export interface StoredFile {
  uri: string;
  size: number;
  mimeType?: string;
  filename: string;
  extension: string;
}

const ATTACHMENTS_DIR = "attachments";
const MODELS_DIR = "models";
const CORPUS_DIR = "rag-corpus";

function inferExtension(
  filename: string | undefined,
  mimeType: string | undefined,
): string {
  if (filename) {
    const idx = filename.lastIndexOf(".");
    if (idx >= 0) return filename.slice(idx).toLowerCase();
  }
  if (mimeType) {
    const map: Record<string, string> = {
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "image/heic": ".heic",
      "audio/mpeg": ".mp3",
      "audio/mp3": ".mp3",
      "audio/wav": ".wav",
      "audio/x-wav": ".wav",
      "audio/m4a": ".m4a",
      "audio/mp4": ".m4a",
      "audio/aac": ".aac",
      "audio/ogg": ".ogg",
      "video/mp4": ".mp4",
      "video/quicktime": ".mov",
      "video/webm": ".webm",
      "application/pdf": ".pdf",
      "text/plain": ".txt",
      "text/markdown": ".md",
    };
    if (map[mimeType]) return map[mimeType];
  }
  return "";
}

function ensureDir(dir: Directory) {
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

export function attachmentsDir(): Directory {
  return ensureDir(new Directory(Paths.document, ATTACHMENTS_DIR));
}

export function modelsDir(): Directory {
  return ensureDir(new Directory(Paths.document, MODELS_DIR));
}

export function corpusDir(): Directory {
  return ensureDir(new Directory(Paths.document, CORPUS_DIR));
}

export function threadAttachmentsDir(threadId: string): Directory {
  return ensureDir(new Directory(attachmentsDir(), threadId));
}

export interface CopyParams {
  sourceUri: string;
  threadId: string;
  attachmentId: string;
  filename?: string;
  mimeType?: string;
}

export function fileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

export function copyToAttachments(params: CopyParams): StoredFile {
  const { sourceUri, threadId, attachmentId, filename, mimeType } = params;
  const ext = inferExtension(filename, mimeType);
  const dir = threadAttachmentsDir(threadId);
  const source = new File(sourceUri);
  if (!source.exists) {
    throw new Error(`Source file does not exist: ${sourceUri}`);
  }
  const target = new File(dir, `${attachmentId}${ext}`);
  if (target.exists) {
    target.delete();
  }
  source.copy(target);
  if (!target.exists) {
    throw new Error(`Failed to store attachment at ${target.uri}`);
  }
  const finalName = filename ?? `${attachmentId}${ext}`;
  return {
    uri: target.uri,
    size: target.size ?? 0,
    mimeType,
    filename: finalName,
    extension: ext,
  };
}

export function deleteFile(uri: string): void {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Best-effort delete: a missing file should not crash the UI.
  }
}

export function writeTextFile(
  dir: Directory,
  name: string,
  content: string,
): string {
  ensureDir(dir);
  const file = new File(dir, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  return file.uri;
}

export function readTextFileSafe(uri: string): string | null {
  try {
    const f = new File(uri);
    if (!f.exists) return null;
    return f.textSync();
  } catch {
    return null;
  }
}

export function listCorpusFiles(): string[] {
  const dir = corpusDir();
  const items = dir.list();
  return items
    .filter((item): item is File => item instanceof File)
    .map((file) => file.uri);
}

export function deleteAllAttachments(): void {
  try {
    const dir = attachmentsDir();
    if (dir.exists) {
      dir.delete();
      ensureDir(dir);
    }
  } catch {
    // Swallow; caller can verify via empty listing.
  }
}

export function deleteAllCorpus(): void {
  try {
    const dir = corpusDir();
    if (dir.exists) {
      dir.delete();
      ensureDir(dir);
    }
  } catch {
    // Swallow.
  }
}

export const Paths_ = Paths;
