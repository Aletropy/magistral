import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The PDF body font is the standard Times, which PDF viewers already have, but it only encodes the
 * Windows-1252 (WinAnsi) characters. Anything else (≥, →, ✓, Greek letters) is drawn with DejaVu Sans,
 * whose symbol coverage is wider than the serif's, embedded only when a document needs it.
 */
export const BODY_FONT = "Times";
export const FALLBACK_FONT = "DejaVuSans";

export const STANDARD_FONT_FILES = {
  normal: "Times-Roman",
  bold: "Times-Bold",
  italics: "Times-Italic",
  bolditalics: "Times-BoldItalic",
} as const;

const FALLBACK_FONT_FILES = {
  normal: "DejaVuSans.ttf",
  bold: "DejaVuSans-Bold.ttf",
  italics: "DejaVuSans-Oblique.ttf",
  bolditalics: "DejaVuSans-BoldOblique.ttf",
} as const;

/** Read at runtime from the installed package; the fonts are never traced into the build output. */
function fallbackFontPath(file: string): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf", file);
}

/** The fallback font files as pdfmake virtual-file-system entries, keyed by their virtual names. */
export function loadFallbackFontFiles(): Record<string, Buffer> {
  return Object.fromEntries(
    Object.values(FALLBACK_FONT_FILES).map((file) => [file, readFileSync(fallbackFontPath(file))]),
  );
}

export const PDF_FONTS = {
  [BODY_FONT]: STANDARD_FONT_FILES,
  [FALLBACK_FONT]: FALLBACK_FONT_FILES,
};

/** Windows-1252 characters in 0x80–0x9F, which Times encodes besides printable Latin-1. */
const WIN_ANSI_EXTRAS = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const LATIN1_MAX = 0xff;
const C1_CONTROLS_START = 0x80;
const C1_CONTROLS_END = 0x9f;

export function isWinAnsi(character: string): boolean {
  const code = character.codePointAt(0)!;
  if (code > LATIN1_MAX) return WIN_ANSI_EXTRAS.has(character);
  return code < C1_CONTROLS_START || code > C1_CONTROLS_END;
}

export interface FontSegment {
  text: string;
  /** Drawn with the fallback font because Times can't encode it. */
  fallback: boolean;
}

/** Splits text into runs Times can encode and runs that need the fallback font, in order. */
export function splitByFont(text: string): FontSegment[] {
  const segments: FontSegment[] = [];
  for (const character of text) {
    const fallback = !isWinAnsi(character);
    const last = segments.at(-1);
    if (last?.fallback === fallback) last.text += character;
    else segments.push({ text: character, fallback });
  }
  return segments;
}
