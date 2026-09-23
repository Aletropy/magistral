import { normalizeForMatch } from "@/lib/text/normalizeForMatch";

const WHITESPACE_RUN = /\s+/g;
const TYPOGRAPHIC_QUOTES = /[“”«»„]/g;
const TYPOGRAPHIC_APOSTROPHES = /[‘’]/g;
const MARKDOWN_EMPHASIS = /[*_]/g;

function normalizeForComparison(text: string): string {
  return normalizeForMatch(text)
    .replace(TYPOGRAPHIC_QUOTES, '"')
    .replace(TYPOGRAPHIC_APOSTROPHES, "'")
    .replace(MARKDOWN_EMPHASIS, "")
    .replace(WHITESPACE_RUN, " ")
    .trim();
}

/**
 * Keeps only excerpts that really occur in the source (ignoring case, accents, quotes, emphasis and
 * line breaks), so few-shot examples can never be text the model invented.
 */
export function verifyExcerpts(excerpts: string[], sourceText: string, maxExcerptChars: number): string[] {
  const source = normalizeForComparison(sourceText);
  return excerpts
    .map((excerpt) => excerpt.trim())
    .filter((excerpt) => excerpt.length > 0 && excerpt.length <= maxExcerptChars)
    .filter((excerpt) => source.includes(normalizeForComparison(excerpt)));
}
