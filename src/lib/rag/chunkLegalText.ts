export interface TextChunk {
  /** Short locator shown to the user and the model, e.g. "Art. 5º" or "Trecho 3". */
  label: string;
  /** The headings the chunk sits under, e.g. "TÍTULO II › CAPÍTULO I – DO IPTU". */
  context: string;
  text: string;
}

export const MAX_CHUNK_CHARS = 2000;
export const CHUNK_OVERLAP_CHARS = 200;
/** A caput repeated on the continuation chunks of a long article is cut to this length. */
export const CAPUT_PREFIX_MAX_CHARS = 400;
/** Fewer articles than this means the text is not legislation (e.g. a parecer). */
export const MIN_ARTICLES_FOR_LEGAL_MODE = 2;
/** Short all-caps lines up to this length count as headings in non-legislative text. */
const MAX_HEADING_LINE_CHARS = 120;

const ARTICLE_START = /^\s*Art(?:igo)?\.?\s*(\d+(?:\.\d+)*)\s*(?:[º°ª]|o(?=[\s.\-–—]))?(?:\s*-\s*([A-Z]))?/i;
const LEGAL_HEADING = /^\s*(LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\b/i;
const PARAGRAPH_START = /^\s*(?:§\s*\d+|Parágrafo\s+único)/i;
const ROMAN_SECTION_HEADING = /^\s*[IVXLC]+\s*[–—-]\s*\S/;
const SENTENCE_BOUNDARY = /(?<=[.;:!?])\s+/;
const BLANK_LINES = /\n\s*\n/;
const WHITESPACE_RUN = /\s+/g;

const HEADING_LEVELS = ["LIVRO", "TITULO", "CAPITULO", "SECAO", "SUBSECAO"] as const;

function headingLevel(line: string): number {
  const keyword = LEGAL_HEADING.exec(line)?.[1] ?? "";
  const normalized = keyword.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  return HEADING_LEVELS.indexOf(normalized as (typeof HEADING_LEVELS)[number]);
}

function isAllCapsTitle(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= MAX_HEADING_LINE_CHARS &&
    /\p{L}/u.test(trimmed) &&
    trimmed === trimmed.toUpperCase()
  );
}

function articleLabel(line: string): string {
  const match = ARTICLE_START.exec(line)!;
  const number = match[1];
  const suffix = match[2] ? `-${match[2].toUpperCase()}` : "";
  // Brazilian drafting uses ordinals for articles 1 to 9 and cardinals from 10 on.
  const ordinal = /^[1-9]$/.test(number) ? "º" : "";
  return `Art. ${number}${ordinal}${suffix}`;
}

/** Splits text into pieces of at most `maxChars`, preferring paragraph, then sentence, then word breaks. */
function splitToFit(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const units = BLANK_LINES.test(text) ? text.split(BLANK_LINES) : text.split(SENTENCE_BOUNDARY);
  if (units.length === 1) {
    const cut = text.lastIndexOf(" ", maxChars) > 0 ? text.lastIndexOf(" ", maxChars) : maxChars;
    return [text.slice(0, cut).trim(), ...splitToFit(text.slice(cut).trim(), maxChars)];
  }
  return packUnits(units.flatMap((unit) => splitToFit(unit.trim(), maxChars)), maxChars, "\n\n");
}

/** Greedily joins units into pieces of at most `maxChars`. */
function packUnits(units: string[], maxChars: number, separator: string): string[] {
  const pieces: string[] = [];
  let current = "";
  for (const unit of units.filter(Boolean)) {
    const candidate = current ? `${current}${separator}${unit}` : unit;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) pieces.push(current);
      current = unit;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

function overlapTail(text: string): string {
  if (text.length <= CHUNK_OVERLAP_CHARS) return text;
  const tail = text.slice(-CHUNK_OVERLAP_CHARS);
  const firstSpace = tail.indexOf(" ");
  return firstSpace >= 0 ? tail.slice(firstSpace + 1) : tail;
}

function clipCaput(caput: string): string {
  const flat = caput.replace(WHITESPACE_RUN, " ").trim();
  return flat.length <= CAPUT_PREFIX_MAX_CHARS ? flat : `${flat.slice(0, CAPUT_PREFIX_MAX_CHARS)}…`;
}

/** Splits one article at its paragraphs (§), repeating the caput so every piece stays self-explanatory. */
function chunkArticle(label: string, context: string, lines: string[]): TextChunk[] {
  const text = lines.join("\n").trim();
  if (text.length <= MAX_CHUNK_CHARS) return [{ label, context, text }];

  const parts: string[][] = [[]];
  for (const line of lines) {
    if (PARAGRAPH_START.test(line)) parts.push([]);
    parts.at(-1)!.push(line);
  }
  const [caput, ...paragraphs] = parts.map((part) => part.join("\n").trim()).filter(Boolean);
  const prefix = `${clipCaput(caput)} (…)`;
  const room = MAX_CHUNK_CHARS - prefix.length - 2;

  const caputPieces = splitToFit(caput, MAX_CHUNK_CHARS);
  const paragraphPieces = packUnits(
    paragraphs.flatMap((paragraph) => splitToFit(paragraph, room)),
    room,
    "\n",
  ).map((piece) => `${prefix}\n${piece}`);

  return [...caputPieces, ...paragraphPieces].map((piece, index) => ({
    label: index === 0 ? label : `${label} (parte ${index + 1})`,
    context,
    text: piece,
  }));
}

function chunkLegislation(lines: string[]): TextChunk[] {
  const chunks: TextChunk[] = [];
  const headings: string[] = [];
  const preamble: string[] = [];
  let article: { label: string; context: string; lines: string[] } | null = null;
  let pendingHeadingLevel = -1;

  const flushArticle = () => {
    if (article) chunks.push(...chunkArticle(article.label, article.context, article.lines));
    article = null;
  };

  for (const line of lines) {
    const level = headingLevel(line);
    if (level >= 0) {
      flushArticle();
      headings.length = level;
      headings[level] = line.trim();
      pendingHeadingLevel = level;
      continue;
    }
    if (pendingHeadingLevel >= 0 && isAllCapsTitle(line) && !ARTICLE_START.test(line)) {
      headings[pendingHeadingLevel] = `${headings[pendingHeadingLevel]} – ${line.trim()}`;
      pendingHeadingLevel = -1;
      continue;
    }
    if (line.trim()) pendingHeadingLevel = -1;

    if (ARTICLE_START.test(line)) {
      flushArticle();
      article = { label: articleLabel(line), context: headings.filter(Boolean).join(" › "), lines: [line] };
    } else if (article) {
      article.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  flushArticle();

  const preambleText = preamble.join("\n").trim();
  const preambleChunks = splitToFit(preambleText, MAX_CHUNK_CHARS)
    .filter(Boolean)
    .map((text, index) => ({ label: index === 0 ? "Preâmbulo" : `Preâmbulo (parte ${index + 1})`, context: "", text }));
  return [...preambleChunks, ...chunks];
}

function isProseHeading(paragraph: string): boolean {
  return !paragraph.includes("\n") && (ROMAN_SECTION_HEADING.test(paragraph) || isAllCapsTitle(paragraph));
}

/** Packs paragraphs of non-legislative text (pareceres, opinions) with a small overlap between chunks. */
function chunkProse(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  let context = "";
  let current = "";

  const flush = () => {
    if (!current.trim()) return;
    chunks.push({ label: `Trecho ${chunks.length + 1}`, context, text: current.trim() });
    current = "";
  };

  for (const rawParagraph of text.split(BLANK_LINES)) {
    const paragraph = rawParagraph.trim();
    if (!paragraph) continue;
    if (isProseHeading(paragraph)) {
      flush();
      context = paragraph;
      continue;
    }
    for (const piece of splitToFit(paragraph, MAX_CHUNK_CHARS - CHUNK_OVERLAP_CHARS)) {
      const candidate = current ? `${current}\n\n${piece}` : piece;
      if (candidate.length <= MAX_CHUNK_CHARS) {
        current = candidate;
      } else {
        const tail = overlapTail(current);
        flush();
        current = `${tail}\n\n${piece}`;
      }
    }
  }
  flush();
  return chunks;
}

/**
 * Splits a legal text into retrieval chunks. Legislation is cut by article, keeping each article with its
 * paragraphs, incisos and alíneas and recording the TÍTULO/CAPÍTULO/SEÇÃO path; other texts are packed
 * by paragraph with overlap.
 */
export function chunkLegalText(text: string): TextChunk[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const articleCount = lines.filter((line) => ARTICLE_START.test(line)).length;
  return articleCount >= MIN_ARTICLES_FOR_LEGAL_MODE ? chunkLegislation(lines) : chunkProse(text);
}
