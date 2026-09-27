import pdfMake from "pdfmake";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { DocumentBlock, HeadingLevel, ListItem, TextRun } from "@/lib/markdown/types";
import {
  BODY_FONT_SIZE_PT,
  HEADING_FONT_SIZE_PT,
  HEADING_SPACING_BEFORE_PT,
  LINE_HEIGHT,
  LIST_MARKER_WIDTH_CM,
  PAGE_MARGIN_CM,
  PARAGRAPH_SPACING_AFTER_PT,
  TITLE_HEADING_LEVEL,
  cmToPoints,
  listTextIndentCm,
} from "./layout";
import { BODY_FONT, FALLBACK_FONT, PDF_FONTS, STANDARD_FONT_FILES, loadFallbackFontFiles, splitByFont } from "./pdfFonts";

const PDF_PAGE_SIZE = "A4";
const STANDARD_FONT_NAMES = new Set<string>(Object.values(STANDARD_FONT_FILES));

pdfMake.setFonts(PDF_FONTS);
// Documents never embed external resources; only the standard font names pass the local check (the
// fallback font is served from pdfmake's in-memory file system, which is checked first).
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy((path) => STANDARD_FONT_NAMES.has(path));

/** pdfmake's in-memory file system; its typings don't declare it. */
const virtualFiles = (pdfMake as unknown as { virtualfs: { writeFileSync(name: string, content: Buffer): void } })
  .virtualfs;
let fallbackFontLoaded = false;

function ensureFallbackFont(): void {
  if (fallbackFontLoaded) return;
  for (const [name, content] of Object.entries(loadFallbackFontFiles())) virtualFiles.writeFileSync(name, content);
  fallbackFontLoaded = true;
}

type Margin = [number, number, number, number];

function margin(beforePt: number, leftPt = 0): Margin {
  return [leftPt, beforePt, 0, PARAGRAPH_SPACING_AFTER_PT];
}

/**
 * Runs carry explicit styles, so a bold heading must force bold onto each run. Characters Times can't
 * encode get the fallback font.
 */
function toPdfRuns(runs: TextRun[], forceBold = false) {
  return runs.flatMap((textRun) =>
    splitByFont(textRun.text).map(({ text, fallback }) => ({
      text,
      bold: forceBold || textRun.bold,
      italics: textRun.italic,
      ...(fallback && { font: FALLBACK_FONT }),
    })),
  );
}

function headingContent(level: HeadingLevel, runs: TextRun[]): Content {
  return {
    text: toPdfRuns(runs, true),
    fontSize: HEADING_FONT_SIZE_PT[level],
    alignment: level === TITLE_HEADING_LEVEL ? "center" : "left",
    margin: margin(HEADING_SPACING_BEFORE_PT),
  };
}

function listItemContent(item: ListItem): Content {
  const markerWidth = cmToPoints(LIST_MARKER_WIDTH_CM);
  return {
    columns: [
      { text: item.marker, width: markerWidth },
      { text: toPdfRuns(item.runs), width: "*", alignment: "justify" },
    ],
    columnGap: 0,
    margin: margin(0, cmToPoints(listTextIndentCm(item.depth)) - markerWidth),
  };
}

function toContent(block: DocumentBlock): Content[] {
  switch (block.type) {
    case "heading":
      return [headingContent(block.level, block.runs)];
    case "paragraph":
      return [{ text: toPdfRuns(block.runs), alignment: "justify", margin: margin(0) }];
    case "list":
      return block.items.map(listItemContent);
  }
}

export async function renderPdf(blocks: DocumentBlock[]): Promise<Uint8Array> {
  ensureFallbackFont();
  const pageMargin = cmToPoints(PAGE_MARGIN_CM);
  const definition: TDocumentDefinitions = {
    pageSize: PDF_PAGE_SIZE,
    pageMargins: [pageMargin, pageMargin, pageMargin, pageMargin],
    defaultStyle: { font: BODY_FONT, fontSize: BODY_FONT_SIZE_PT, lineHeight: LINE_HEIGHT },
    content: blocks.flatMap(toContent),
  };
  return pdfMake.createPdf(definition).getBuffer();
}
