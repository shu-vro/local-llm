import { useContext } from "react";

import {
  DatabaseContext,
  DatabaseContextValue,
} from "@/providers/DatabaseProvider";

export function useDatabase(options?: {
  optional?: false;
}): DatabaseContextValue;
export function useDatabase(options: {
  optional: true;
}): DatabaseContextValue | null;
export function useDatabase(options?: {
  optional?: boolean;
}): DatabaseContextValue | null {
  const ctx = useContext(DatabaseContext);
  if (!ctx) {
    if (options?.optional) return null;
    throw new Error("useDatabase must be used inside <DatabaseProvider>");
  }
  return ctx;
}
