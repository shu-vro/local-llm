import { Platform, TextStyle } from "react-native";

const systemFont = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
});

const monoFont = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

export const Typography = {
  family: {
    sans: systemFont,
    mono: monoFont,
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 26,
    title: 30,
  },
  weight: {
    regular: "400" as TextStyle["fontWeight"],
    medium: "500" as TextStyle["fontWeight"],
    semibold: "600" as TextStyle["fontWeight"],
    bold: "700" as TextStyle["fontWeight"],
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.55,
  },
} as const;

export {
  DEFAULT_MODEL_REGISTRY_ALIAS as MODEL_ALIAS,
  DEFAULT_MODEL_DISPLAY_ID as MODEL_DISPLAY_NAME,
} from "@/ai/models";
