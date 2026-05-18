import React, {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createRepositories, Repositories } from "@/db/repositories";
import { openAppDatabase, resetAppDatabaseInstance } from "@/db/sqlite";
import { bindHfTokenSettings } from "@/native/hfAuth";
import { NativeSQLite } from "@/native/sqlite";

export interface DatabaseContextValue {
  db: NativeSQLite | null;
  repos: Repositories | null;
  ready: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

export const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<NativeSQLite | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const instance = await openAppDatabase();
        if (cancelled || !mountedRef.current) return;
        setDb(instance);
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  const repos = useMemo(() => (db ? createRepositories(db) : null), [db]);

  useEffect(() => {
    if (repos) bindHfTokenSettings(repos.settings);
  }, [repos]);

  const value = useMemo<DatabaseContextValue>(
    () => ({
      db,
      repos,
      ready: !!db && !!repos,
      error,
      async reload() {
        try {
          await resetAppDatabaseInstance();
          const instance = await openAppDatabase();
          setDb(instance);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      },
    }),
    [db, repos, error],
  );

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}
