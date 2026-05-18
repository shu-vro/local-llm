import { useCallback, useEffect, useState } from "react";

import { AppSettings, DEFAULT_SETTINGS } from "@/db/repositories/settingsRepo";
import { useDatabase } from "@/hooks/useDatabase";

export interface UseSettingsResult {
  settings: AppSettings;
  loading: boolean;
  reload: () => Promise<void>;
  update: (partial: Partial<AppSettings>) => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  const { repos, ready } = useDatabase();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!repos) return;
    setLoading(true);
    try {
      const s = await repos.settings.getAll();
      setSettings(s);
    } finally {
      setLoading(false);
    }
  }, [repos]);

  useEffect(() => {
    if (!ready) return;
    void reload();
  }, [ready, reload]);

  const update = useCallback(
    async (partial: Partial<AppSettings>) => {
      if (!repos) return;
      await repos.settings.update(partial);
      await reload();
    },
    [reload, repos],
  );

  return { settings, loading, reload, update };
}
