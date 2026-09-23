const COMBINING_MARKS = /\p{M}/gu;

/** Lowercases and strips accents so "Outrossim" and "outrossím" compare equal. */
export function normalizeForMatch(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}
