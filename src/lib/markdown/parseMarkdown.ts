import { Lexer, type MarkedToken, type Token, type Tokens } from "marked";
import {
  MAX_HEADING_LEVEL,
  type DocumentBlock,
  type HeadingLevel,
  type ListItem,
  type TextRun,
} from "./types";

type RunStyle = Pick<TextRun, "bold" | "italic">;

const PLAIN_STYLE: RunStyle = { bold: false, italic: false };
const LINE_BREAK = "\n";
const HTML_LINE_BREAK = /^<br\s*\/?>$/i;
/** "____" is Markdown for a horizontal rule, but in a contract it is a signature line. */
const SIGNATURE_LINE = /^_{3,}$/;
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};
const HTML_ENTITY_PATTERN = new RegExp(Object.keys(HTML_ENTITIES).join("|"), "g");

const BULLET_MARKERS = ["•", "–"];
const FIRST_LETTER_CODE = "a".charCodeAt(0);
const ALPHABET_SIZE = 26;
const DEFAULT_LIST_START = 1;

function decodeEntities(text: string): string {
  return text.replace(HTML_ENTITY_PATTERN, (entity) => HTML_ENTITIES[entity]);
}

function run(text: string, style: RunStyle): TextRun {
  return { text: decodeEntities(text), ...style };
}

/** Joins adjacent runs that share a style and drops empty ones. */
function mergeRuns(runs: TextRun[]): TextRun[] {
  const merged: TextRun[] = [];
  for (const current of runs) {
    if (!current.text) continue;
    const previous = merged.at(-1);
    if (previous && previous.bold === current.bold && previous.italic === current.italic) {
      previous.text += current.text;
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

function inlineRuns(token: MarkedToken, style: RunStyle): TextRun[] {
  switch (token.type) {
    case "strong":
      return collectRuns(token.tokens, { ...style, bold: true });
    case "em":
      return collectRuns(token.tokens, { ...style, italic: true });
    case "link":
    case "del":
      return collectRuns(token.tokens, style);
    case "text":
      return token.tokens ? collectRuns(token.tokens, style) : [run(token.text, style)];
    case "br":
      return [run(LINE_BREAK, style)];
    case "html":
      return HTML_LINE_BREAK.test(token.text) ? [run(LINE_BREAK, style)] : [];
    case "codespan":
    case "escape":
      return [run(token.text, style)];
    default:
      return "text" in token ? [run(token.text, style)] : [];
  }
}

function collectRuns(tokens: Token[] = [], style: RunStyle = PLAIN_STYLE): TextRun[] {
  return tokens.flatMap((token) => inlineRuns(token as MarkedToken, style));
}

function toRuns(tokens: Token[] | undefined): TextRun[] {
  return mergeRuns(collectRuns(tokens));
}

/** Keeps an underscore rule as text (a signature line); other rules render as nothing. */
function signatureLineRuns(rule: Tokens.Hr): TextRun[] {
  const line = rule.raw.trim();
  return SIGNATURE_LINE.test(line) ? [run(line, PLAIN_STYLE)] : [];
}

function toLetter(position: number): string {
  return position <= ALPHABET_SIZE
    ? String.fromCharCode(FIRST_LETTER_CODE + position - 1)
    : String(position);
}

function listMarker(ordered: boolean, depth: number, position: number): string {
  if (!ordered) return BULLET_MARKERS[Math.min(depth, BULLET_MARKERS.length - 1)];
  return depth % 2 === 0 ? `${position}.` : `${toLetter(position)})`;
}

function toListItems(list: Tokens.List, depth: number): ListItem[] {
  const start = typeof list.start === "number" ? list.start : DEFAULT_LIST_START;

  return list.items.flatMap((item, index) => {
    const nestedItems: ListItem[] = [];
    const lines: TextRun[][] = [];
    for (const child of item.tokens as MarkedToken[]) {
      if (child.type === "list") {
        nestedItems.push(...toListItems(child, depth + 1));
      } else if (child.type === "hr") {
        const signature = signatureLineRuns(child);
        if (signature.length > 0) lines.push(signature);
      } else if ("tokens" in child && child.tokens) {
        lines.push(collectRuns(child.tokens));
      } else if ("text" in child) {
        lines.push([run(child.text, PLAIN_STYLE)]);
      }
    }
    const runs = mergeRuns(
      lines.flatMap((line, i) => (i === 0 ? line : [run(LINE_BREAK, PLAIN_STYLE), ...line])),
    );

    return [{ marker: listMarker(list.ordered, depth, start + index), depth, runs }, ...nestedItems];
  });
}

function paragraph(runs: TextRun[]): DocumentBlock[] {
  return runs.length > 0 ? [{ type: "paragraph", runs }] : [];
}

function toBlocks(token: MarkedToken): DocumentBlock[] {
  switch (token.type) {
    case "heading": {
      const level = Math.min(token.depth, MAX_HEADING_LEVEL) as HeadingLevel;
      return [{ type: "heading", level, runs: toRuns(token.tokens) }];
    }
    case "paragraph":
      return paragraph(toRuns(token.tokens));
    case "list":
      return [{ type: "list", items: toListItems(token, 0) }];
    case "blockquote":
      return token.tokens.flatMap((child) => toBlocks(child as MarkedToken));
    case "code":
      return paragraph([run(token.text, PLAIN_STYLE)]);
    case "table":
      return paragraph([run(token.raw.trim(), PLAIN_STYLE)]);
    case "hr":
      return paragraph(signatureLineRuns(token));
    case "space":
    case "def":
    case "html":
      return [];
    default:
      if ("tokens" in token && token.tokens) return paragraph(toRuns(token.tokens));
      return "text" in token ? paragraph([run(token.text, PLAIN_STYLE)]) : [];
  }
}

/** Parses LLM Markdown into the block model shared by the preview, DOCX and PDF renderers. */
export function parseMarkdown(markdown: string): DocumentBlock[] {
  const tokens = new Lexer().lex(markdown) as MarkedToken[];
  return tokens.flatMap(toBlocks);
}

export function toPlainText(runs: TextRun[]): string {
  return runs.map((textRun) => textRun.text).join("");
}
