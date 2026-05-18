export interface ModelCapabilities {
  completion: boolean;
  tools: boolean;
  vision: boolean;
  audio: boolean;
  embed: boolean;
  transcription: boolean;
  appleNpu: boolean;
  gated: boolean;
}

const GATED_PATTERNS = [/gemma-3-1b/i, /gemma-4/i, /gemma-3n/i];

export function parseCapabilities(
  tags: string[],
  apple: boolean,
  modelId: string,
): ModelCapabilities {
  const set = new Set(tags.map((t) => t.toLowerCase()));
  return {
    completion: set.has("completion"),
    tools: set.has("tools"),
    vision: set.has("vision"),
    audio: set.has("audio"),
    embed: set.has("embed") || set.has("text-embed") || set.has("image-embed"),
    transcription: set.has("transcription"),
    appleNpu: apple || set.has("apple-npu"),
    gated: GATED_PATTERNS.some((re) => re.test(modelId)),
  };
}

export function capabilityChips(cap: ModelCapabilities): string[] {
  const chips: string[] = [];
  if (cap.completion) chips.push("Chat");
  if (cap.vision) chips.push("Vision");
  if (cap.audio) chips.push("Audio");
  if (cap.tools) chips.push("Tools");
  if (cap.embed) chips.push("Embed");
  if (cap.transcription) chips.push("Speech");
  if (cap.appleNpu) chips.push("Apple NPU");
  return chips;
}

export function supportsChat(cap: ModelCapabilities): boolean {
  return cap.completion;
}

export function supportsVision(cap: ModelCapabilities): boolean {
  return cap.vision;
}
