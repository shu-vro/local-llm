import type { SettingsRepo } from "@/db/repositories/settingsRepo";

/** Stored in SQLite settings; avoids native SecureStore (no extra prebuild). */
export const HF_TOKEN_SETTINGS_KEY = "secrets.huggingfaceToken";

let settingsRepo: SettingsRepo | null = null;

export function bindHfTokenSettings(repo: SettingsRepo): void {
  settingsRepo = repo;
}

export async function getHuggingFaceToken(): Promise<string | null> {
  if (!settingsRepo) return null;
  try {
    const value = await settingsRepo.get(HF_TOKEN_SETTINGS_KEY);
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}

export async function setHuggingFaceToken(token: string | null): Promise<void> {
  if (!settingsRepo) return;
  if (!token?.trim()) {
    await settingsRepo.remove(HF_TOKEN_SETTINGS_KEY);
    return;
  }
  await settingsRepo.set(HF_TOKEN_SETTINGS_KEY, token.trim());
}

export function huggingFaceAuthHeaders(
  token: string | null,
): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** HF supports token query param for gated file downloads. */
export function withHuggingFaceTokenUrl(
  url: string,
  token: string | null,
): string {
  if (!token || !url.includes("huggingface.co")) return url;
  const param = `token=${encodeURIComponent(token)}`;
  return url.includes("?") ? `${url}&${param}` : `${url}?${param}`;
}
