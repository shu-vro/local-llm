import { useCallback, useEffect, useState } from "react";

import { getHuggingFaceToken, setHuggingFaceToken } from "@/native/hfAuth";

export function useHuggingFaceToken() {
  const [token, setToken] = useState<string>("");
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await getHuggingFaceToken();
      setToken(stored ?? "");
      setHasToken(!!stored);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async (value: string) => {
    const trimmed = value.trim();
    await setHuggingFaceToken(trimmed || null);
    setToken(trimmed);
    setHasToken(!!trimmed);
  }, []);

  const clear = useCallback(async () => {
    await setHuggingFaceToken(null);
    setToken("");
    setHasToken(false);
  }, []);

  return { token, hasToken, loading, save, clear, reload };
}
