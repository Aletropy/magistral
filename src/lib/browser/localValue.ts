/**
 * Small wrappers over localStorage for per-browser conveniences (a remembered tab, an unsent draft).
 * Storage can be unavailable (private windows, blocked site data), so every access is guarded, and a
 * change event lets components re-read a value through useSyncExternalStore.
 */
const CHANGE_EVENT = "magistral-local-value-change";

export function readLocalValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalValue(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable or full: the convenience is simply lost.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Removes every value whose key starts with `prefix`, e.g. private drafts when signing out. */
export function removeLocalValues(prefix: string): void {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    for (const key of keys) if (key?.startsWith(prefix)) localStorage.removeItem(key);
  } catch {
    // Storage unavailable: nothing was stored.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeLocalValues(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
