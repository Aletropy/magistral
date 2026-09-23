"use client";

import { useSyncExternalStore } from "react";
import { currentTheme, type Theme } from "@/lib/theme/theme";

/** Re-renders when the <html> class changes, whether from the theme button or from the OS preference. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** The server can't know the theme; null keeps the first client render identical to the server's. */
function serverTheme(): Theme | null {
  return null;
}

/** The active theme, or null before hydration. */
export function useCurrentTheme(): Theme | null {
  return useSyncExternalStore(subscribe, currentTheme, serverTheme);
}
