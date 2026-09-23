import { normalizeForMatch } from "@/lib/text/normalizeForMatch";

const HEADING = /^#{2,4}\s+(.+)$/gm;

/**
 * Whether the approved clauses appear in the minuta in the order the user chose. Each clause is located
 * by the first heading containing its title (ignoring case and accents); clauses whose heading the model
 * renamed can't be located and are left out of the comparison.
 */
export function isApprovedClauseOrderKept(markdown: string, clauseTitles: string[]): boolean {
  const headings = [...markdown.matchAll(HEADING)].map((match) => normalizeForMatch(match[1]));
  const positions = clauseTitles
    .map((title) => headings.findIndex((heading) => heading.includes(normalizeForMatch(title))))
    .filter((position) => position >= 0);
  return positions.every((position, index) => index === 0 || position > positions[index - 1]);
}
