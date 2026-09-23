"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { currentTheme, setTheme, type Theme } from "@/lib/theme/theme";

/** Re-renders when the <html> class changes, whether from this button or from the OS preference. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** The server can't know the theme; null keeps the first client render identical to the server's. */
function serverTheme(): Theme | null {
  return null;
}

const LABELS: Record<Theme | "unknown", string> = {
  light: "Ativar tema escuro",
  dark: "Ativar tema claro",
  unknown: "Alternar tema claro/escuro",
};

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, serverTheme);
  const label = LABELS[theme ?? "unknown"];

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={() => setTheme(currentTheme() === "dark" ? "light" : "dark")}
    >
      {/* Both icons render and CSS shows the right one, so nothing flickers before hydration. */}
      <Sun className="hidden dark:block" aria-hidden />
      <Moon className="dark:hidden" aria-hidden />
    </Button>
  );
}
