import { normalizeForMatch } from "@/lib/text/normalizeForMatch";

const HEADING_LINE = /^(#{2,4})\s+(.+)$/gm;

export interface ClauseSection {
  /** Heading text as the model wrote it. */
  heading: string;
  /** Offsets of the section body (everything after the heading line up to the next heading of the same or a higher level). */
  bodyStart: number;
  bodyEnd: number;
  body: string;
}

interface Heading {
  level: number;
  text: string;
  start: number;
  lineEnd: number;
}

function readHeadings(markdown: string): Heading[] {
  return [...markdown.matchAll(HEADING_LINE)].map((match) => ({
    level: match[1].length,
    text: match[2],
    start: match.index,
    lineEnd: match.index + match[0].length,
  }));
}

/**
 * Finds, for each clause title, the minuta section whose heading contains it (ignoring case, accents and
 * numbering). Null when the model renamed the heading beyond recognition.
 */
export function locateClauseSections(markdown: string, titles: string[]): (ClauseSection | null)[] {
  const headings = readHeadings(markdown);
  return titles.map((title) => {
    const index = headings.findIndex((heading) => normalizeForMatch(heading.text).includes(normalizeForMatch(title)));
    if (index < 0) return null;
    const heading = headings[index];
    const next = headings.slice(index + 1).find((candidate) => candidate.level <= heading.level);
    const bodyEnd = next ? next.start : markdown.length;
    const raw = markdown.slice(heading.lineEnd, bodyEnd);
    const leading = raw.length - raw.trimStart().length;
    const body = raw.trim();
    return { heading: heading.text, bodyStart: heading.lineEnd + leading, bodyEnd: heading.lineEnd + leading + body.length, body };
  });
}

/** Replaces one located section's body, keeping everything else byte for byte. */
export function replaceSectionBody(markdown: string, section: ClauseSection, body: string): string {
  return `${markdown.slice(0, section.bodyStart)}${body}${markdown.slice(section.bodyEnd)}`;
}

/** Whether the approved clauses that could be located appear in the order the user chose. */
export function isApprovedClauseOrderKept(markdown: string, titles: string[]): boolean {
  const positions = locateClauseSections(markdown, titles).flatMap((section) => (section ? [section.bodyStart] : []));
  return positions.every((position, index) => index === 0 || position > positions[index - 1]);
}
