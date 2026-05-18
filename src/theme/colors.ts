export type ThemeName = "light" | "dark";
export type ThemePreference = "system" | "light" | "dark";

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  border: string;
  divider: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryText: string;
  accent: string;
  danger: string;
  dangerSubtle: string;
  success: string;
  warning: string;
  bubbleUser: string;
  bubbleUserText: string;
  bubbleAssistant: string;
  bubbleAssistantText: string;
  backdrop: string;
  composerBg: string;
  shadow: string;
}

export const lightColors: ThemeColors = {
  background: "#FFFFFF",
  surface: "#F7F7F8",
  surfaceElevated: "#FFFFFF",
  surfaceMuted: "#EEEEF1",
  border: "#E5E5EA",
  divider: "#ECECF1",
  text: "#0B0B0E",
  textMuted: "#6E6E80",
  textInverse: "#FFFFFF",
  primary: "#0B0B0E",
  primaryText: "#FFFFFF",
  accent: "#10A37F",
  danger: "#D7263D",
  dangerSubtle: "#FCE7EA",
  success: "#10A37F",
  warning: "#C77700",
  bubbleUser: "#0B0B0E",
  bubbleUserText: "#FFFFFF",
  bubbleAssistant: "transparent",
  bubbleAssistantText: "#0B0B0E",
  backdrop: "rgba(11,11,14,0.45)",
  composerBg: "#FFFFFF",
  shadow: "rgba(0,0,0,0.08)",
};

export const darkColors: ThemeColors = {
  background: "#0B0B0E",
  surface: "#16161B",
  surfaceElevated: "#1F1F25",
  surfaceMuted: "#23232B",
  border: "#2A2A33",
  divider: "#23232B",
  text: "#ECECEC",
  textMuted: "#9A9AA8",
  textInverse: "#0B0B0E",
  primary: "#ECECEC",
  primaryText: "#0B0B0E",
  accent: "#19C37D",
  danger: "#FF5C7A",
  dangerSubtle: "#3A1922",
  success: "#19C37D",
  warning: "#F5A623",
  bubbleUser: "#1F1F25",
  bubbleUserText: "#ECECEC",
  bubbleAssistant: "transparent",
  bubbleAssistantText: "#ECECEC",
  backdrop: "rgba(0,0,0,0.55)",
  composerBg: "#16161B",
  shadow: "rgba(0,0,0,0.5)",
};

export function colorsFor(theme: ThemeName): ThemeColors {
  return theme === "dark" ? darkColors : lightColors;
}
