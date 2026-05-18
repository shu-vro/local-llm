const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomHex(len: number): string {
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

export function newId(prefix?: string): string {
  const ts = Date.now().toString(36);
  const rand = randomHex(10);
  return prefix ? `${prefix}_${ts}${rand}` : `${ts}${rand}`;
}

export const threadId = () => newId("thr");
export const messageId = () => newId("msg");
export const attachmentId = () => newId("att");
