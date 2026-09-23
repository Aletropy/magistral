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

const PDF_FONT = "Times";
const PDF_PAGE_SIZE = "A4";
/** PDF standard fonts are built into PDFKit, so no font files are read from disk. */
const STANDARD_FONTS = {
  [PDF_FONT]: {
    normal: "Times-Roman",
    bold: "Times-Bold",
    italics: "Times-Italic",
    bolditalics: "Times-BoldItalic",
  },
};
const STANDARD_FONT_NAMES = new Set(Object.values(STANDARD_FONTS[PDF_FONT]));

pdfMake.setFonts(STANDARD_FONTS);
// Documents never embed external resources; only the standard font names pass the local check.
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy((path) => STANDARD_FONT_NAMES.has(path));

type Margin = [number, number, number, number];

function margin(beforePt: number, leftPt = 0): Margin {
  return [leftPt, beforePt, 0, PARAGRAPH_SPACING_AFTER_PT];
}

/** Runs carry explicit styles, so a bold heading must force bold onto each run. */
function toPdfRuns(runs: TextRun[], forceBold = false) {
  return runs.map((textRun) => ({
    text: textRun.text,
    bold: forceBold || textRun.bold,
    italics: textRun.italic,
  }));
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
  const pageMargin = cmToPoints(PAGE_MARGIN_CM);
  const definition: TDocumentDefinitions = {
    pageSize: PDF_PAGE_SIZE,
    pageMargins: [pageMargin, pageMargin, pageMargin, pageMargin],
    defaultStyle: { font: PDF_FONT, fontSize: BODY_FONT_SIZE_PT, lineHeight: LINE_HEIGHT },
    content: blocks.flatMap(toContent),
  };
  return pdfMake.createPdf(definition).getBuffer();
}
