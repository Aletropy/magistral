import { diff_match_patch as DiffMatchPatch } from "diff-match-patch";

export type RedlinePart =
  | { type: "equal"; text: string }
  /** One contiguous change: text removed from the original and text added in the revision. */
  | { type: "change"; id: number; deleted: string; inserted: string };

export type HunkDecision = "accept" | "reject";

const TOKEN = /\s+|[^\s]+/g;
/** Diffing gives up refining after this long and returns a coarser (still correct) diff. */
const DIFF_TIMEOUT_SECONDS = 2;

/**
 * Encodes each distinct word or whitespace run as one character, so the character diff works on whole
 * words (the same trick diff_linesToChars uses for lines).
 */
function encodeWords(original: string, revised: string) {
  const tokens: string[] = [];
  const codes = new Map<string, string>();
  const encode = (text: string) =>
    (text.match(TOKEN) ?? [])
      .map((token) => {
        let code = codes.get(token);
        if (code === undefined) {
          code = String.fromCharCode(tokens.length);
          codes.set(token, code);
          tokens.push(token);
        }
        return code;
      })
      .join("");
  return { tokens, original: encode(original), revised: encode(revised) };
}

/** Word-level diff of two texts, cleaned up for human reading and grouped into reviewable changes. */
export function diffWords(original: string, revised: string): RedlinePart[] {
  const dmp = new DiffMatchPatch();
  dmp.Diff_Timeout = DIFF_TIMEOUT_SECONDS;
  const encoded = encodeWords(original, revised);
  const diffs = dmp.diff_main(encoded.original, encoded.revised, false);
  dmp.diff_cleanupSemantic(diffs);

  const parts: RedlinePart[] = [];
  let nextId = 0;
  for (const [operation, codes] of diffs) {
    const text = [...codes].map((code) => encoded.tokens[code.charCodeAt(0)]).join("");
    const last = parts.at(-1);
    if (operation === DiffMatchPatch.DIFF_EQUAL) {
      parts.push({ type: "equal", text });
    } else if (last?.type === "change") {
      if (operation === DiffMatchPatch.DIFF_DELETE) last.deleted += text;
      else last.inserted += text;
    } else {
      parts.push({
        type: "change",
        id: nextId++,
        deleted: operation === DiffMatchPatch.DIFF_DELETE ? text : "",
        inserted: operation === DiffMatchPatch.DIFF_INSERT ? text : "",
      });
    }
  }
  return parts;
}

/** Rebuilds the text from the diff: accepted changes keep the revision, rejected ones restore the original. */
export function applyHunkDecisions(
  parts: RedlinePart[],
  decisions: ReadonlyMap<number, HunkDecision>,
  defaultDecision: HunkDecision = "accept",
): string {
  return parts
    .map((part) => {
      if (part.type === "equal") return part.text;
      return (decisions.get(part.id) ?? defaultDecision) === "accept" ? part.inserted : part.deleted;
    })
    .join("");
}
