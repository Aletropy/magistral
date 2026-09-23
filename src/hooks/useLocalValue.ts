"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readLocalValue, subscribeLocalValues, writeLocalValue } from "@/lib/browser/localValue";

function serverSnapshot(): null {
  return null;
}

/** A localStorage value that re-renders on change; null on the server and when missing. */
export function useLocalValue(key: string): [string | null, (value: string | null) => void] {
  const value = useSyncExternalStore(subscribeLocalValues, () => readLocalValue(key), serverSnapshot);
  const setValue = useCallback((next: string | null) => writeLocalValue(key, next), [key]);
  return [value, setValue];
}
