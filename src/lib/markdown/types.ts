export const MAX_HEADING_LEVEL = 4;

export type HeadingLevel = 1 | 2 | 3 | 4;

export interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

export interface ListItem {
  /** Rendered marker text, e.g. "1.", "a)" or "•". */
  marker: string;
  /** Nesting depth, 0 for top-level items. */
  depth: number;
  runs: TextRun[];
}

export type DocumentBlock =
  | { type: "heading"; level: HeadingLevel; runs: TextRun[] }
  | { type: "paragraph"; runs: TextRun[] }
  | { type: "list"; items: ListItem[] };
