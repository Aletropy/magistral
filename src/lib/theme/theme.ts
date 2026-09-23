export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** Where the user's explicit choice is kept; without it the app follows the operating system. */
export const THEME_STORAGE_KEY = "magistral-theme";
export const DARK_CLASS = "dark";
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs in <head> before first paint so the page never flashes the wrong theme. It applies the saved
 * choice or the system preference, and keeps following the system until the user picks a theme.
 * Storage can be unavailable (private windows, blocked site data), so every access is guarded.
 */
export const THEME_INIT_SCRIPT = `(function () {
  var root = document.documentElement;
  var media = window.matchMedia(${JSON.stringify(DARK_MEDIA_QUERY)});
  function saved() {
    try { return localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch (e) { return null; }
  }
  function apply() {
    var theme = saved();
    root.classList.toggle(${JSON.stringify(DARK_CLASS)}, theme ? theme === "dark" : media.matches);
  }
  apply();
  media.addEventListener("change", function () { if (!saved()) apply(); });
})();`;

/** Without this, controls with color transitions fade at different speeds and the switch looks smeared. */
const NO_TRANSITIONS_CSS = "*,*::before,*::after{transition:none!important}";

/** Applies a theme instantly and remembers it; the choice still applies for this visit if storage is blocked. */
export function setTheme(theme: Theme): void {
  const pause = document.createElement("style");
  pause.textContent = NO_TRANSITIONS_CSS;
  document.head.appendChild(pause);
  document.documentElement.classList.toggle(DARK_CLASS, theme === "dark");
  // Force a style recalculation with transitions off, then turn them back on.
  void window.getComputedStyle(document.body).color;
  requestAnimationFrame(() => pause.remove());
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable: nothing to persist.
  }
}

export function currentTheme(): Theme {
  return document.documentElement.classList.contains(DARK_CLASS) ? "dark" : "light";
}
