import { useContext } from "react";

import { CactusContext, CactusContextValue } from "@/providers/CactusProvider";

export function useCactus(): CactusContextValue {
  const ctx = useContext(CactusContext);
  if (!ctx) throw new Error("useCactus must be used inside <CactusProvider>");
  return ctx;
}
