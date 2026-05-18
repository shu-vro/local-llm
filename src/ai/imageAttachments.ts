import { Attachment } from "@/db/repositories/attachmentsRepo";
import { fileExists } from "@/native/fileStore";

const IMAGE_KIND = "image";

function isImageAttachment(att: Attachment): boolean {
  if (att.kind !== IMAGE_KIND) return false;
  const mime = (att.mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const uri = att.localUri.toLowerCase();
  return /\.(png|jpe?g|webp|gif|heic|heif|bmp)$/i.test(uri);
}

/** Returns a readable on-disk path for vision inference, or null if missing. */
export function resolveInferenceImagePath(att: Attachment): string | null {
  if (!isImageAttachment(att)) return null;
  if (!fileExists(att.localUri)) return null;
  return att.localUri;
}
