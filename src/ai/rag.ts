import { Directory } from "expo-file-system";

import {
  corpusDir as ensureCorpusDir,
  listCorpusFiles,
  writeTextFile,
} from "@/native/fileStore";
import { newId } from "@/utils/ids";

import { CactusClient } from "./cactusClient";

export interface CorpusEntry {
  uri: string;
  source: string;
}

export function corpusPath(): string {
  return ensureCorpusDir().uri;
}

export function listCorpusEntries(): CorpusEntry[] {
  return listCorpusFiles().map((uri) => ({
    uri,
    source: uri.split("/").filter(Boolean).pop() ?? uri,
  }));
}

export function saveCorpusNote(content: string, label?: string): CorpusEntry {
  const dir: Directory = ensureCorpusDir();
  const safeLabel = (label ?? "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const name = `${safeLabel || "note"}-${newId()}.txt`;
  const uri = writeTextFile(dir, name, content);
  return { uri, source: name };
}

export interface RagQueryResultChunk {
  source: string;
  content: string;
  score: number;
}

export async function ragQuery(
  client: CactusClient,
  query: string,
  topK = 5,
): Promise<RagQueryResultChunk[]> {
  if (!query.trim()) return [];
  const chunks = await client.ragQuery(query, topK);
  return chunks.map((c) => ({
    source: c.source,
    content: c.content,
    score: c.score,
  }));
}
