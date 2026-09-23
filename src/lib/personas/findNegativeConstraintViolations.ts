import { normalizeForMatch } from "@/lib/text/normalizeForMatch";

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;
const WHITESPACE_RUN = /\s+/g;

function termPattern(term: string): RegExp {
  const escaped = normalizeForMatch(term.trim())
    .replace(REGEX_SPECIAL_CHARS, "\\$&")
    .replace(WHITESPACE_RUN, "\\s+");
  // Letters or digits on either side mean the term is part of a longer word.
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u");
}

/** The forbidden terms that appear as whole words in `text`, ignoring case and accents. */
export function findNegativeConstraintViolations(text: string, constraints: string[]): string[] {
  const normalized = normalizeForMatch(text);
  return constraints.filter((term) => term.trim() && termPattern(term).test(normalized));
}
