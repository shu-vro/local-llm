import { useContext } from "react";

import { ThemeContext } from "@/providers/ThemeProvider";
import { ThemeColors, ThemeName, ThemePreference, colorsFor } from "@/theme";

export function useTheme(): {
  theme: ThemeName;
  colors: ThemeColors;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
} {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    theme: "dark",
    colors: colorsFor("dark"),
    preference: "system",
    setPreference: () => undefined,
  };
}
