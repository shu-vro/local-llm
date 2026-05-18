import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

import { useDatabase } from "@/hooks/useDatabase";
import { ThemeColors, ThemeName, ThemePreference, colorsFor } from "@/theme";

export interface ThemeContextValue {
  theme: ThemeName;
  colors: ThemeColors;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const SETTINGS_KEY = "theme.preference";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const db = useDatabase({ optional: true });
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let cancelled = false;
    if (!db?.repos) return;
    void db.repos.settings.get(SETTINGS_KEY).then((value) => {
      if (cancelled) return;
      if (value === "light" || value === "dark" || value === "system") {
        setPreferenceState(value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [db?.repos]);

  const setPreference = useCallback(
    (pref: ThemePreference) => {
      setPreferenceState(pref);
      void db?.repos?.settings.set(SETTINGS_KEY, pref);
    },
    [db?.repos],
  );

  const theme: ThemeName =
    preference === "system"
      ? system === "dark"
        ? "dark"
        : "light"
      : preference;
  const colors = useMemo(() => colorsFor(theme), [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colors, preference, setPreference }),
    [theme, colors, preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
