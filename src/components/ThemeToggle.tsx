"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentTheme } from "@/hooks/useCurrentTheme";
import { currentTheme, setTheme, type Theme } from "@/lib/theme/theme";

const LABELS: Record<Theme | "unknown", string> = {
  light: "Ativar tema escuro",
  dark: "Ativar tema claro",
  unknown: "Alternar tema claro/escuro",
};

export function ThemeToggle() {
  const theme = useCurrentTheme();
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
