import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Tab,
  TextRun as DocxTextRun,
  type IRunOptions,
} from "docx";
import type { DocumentBlock, HeadingLevel, ListItem, TextRun } from "@/lib/markdown/types";
import {
  BODY_FONT_SIZE_PT,
  HEADING_FONT_SIZE_PT,
  HEADING_SPACING_BEFORE_PT,
  LINE_HEIGHT,
  LIST_MARKER_WIDTH_CM,
  PAGE_HEIGHT_CM,
  PAGE_MARGIN_CM,
  PAGE_WIDTH_CM,
  PARAGRAPH_SPACING_AFTER_PT,
  TITLE_HEADING_LEVEL,
  cmToTwips,
  listTextIndentCm,
  pointsToTwips,
} from "./layout";

const DOCX_FONT = "Times New Roman";
const HALF_POINTS_PER_POINT = 2;
const DOCX_SINGLE_LINE_SPACING = 240;
const LINE_BREAK = "\n";

type RunFormatting = Pick<IRunOptions, "bold" | "size">;

function toDocxRuns(runs: TextRun[], formatting: RunFormatting = {}): DocxTextRun[] {
  return runs.flatMap((textRun) =>
    textRun.text.split(LINE_BREAK).map(
      (segment, index) =>
        new DocxTextRun({
          text: segment,
          bold: formatting.bold ?? textRun.bold,
          italics: textRun.italic,
          size: formatting.size,
          break: index > 0 ? 1 : undefined,
        }),
    ),
  );
}

const bodySpacing = {
  after: pointsToTwips(PARAGRAPH_SPACING_AFTER_PT),
  line: Math.round(LINE_HEIGHT * DOCX_SINGLE_LINE_SPACING),
};

function headingParagraph(level: HeadingLevel, runs: TextRun[]): Paragraph {
  return new Paragraph({
    children: toDocxRuns(runs, {
      bold: true,
      size: HEADING_FONT_SIZE_PT[level] * HALF_POINTS_PER_POINT,
    }),
    alignment: level === TITLE_HEADING_LEVEL ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { ...bodySpacing, before: pointsToTwips(HEADING_SPACING_BEFORE_PT) },
    keepNext: true,
  });
}

function bodyParagraph(runs: TextRun[]): Paragraph {
  return new Paragraph({
    children: toDocxRuns(runs),
    alignment: AlignmentType.JUSTIFIED,
    spacing: bodySpacing,
  });
}

function listItemParagraph(item: ListItem): Paragraph {
  return new Paragraph({
    children: [new DocxTextRun({ children: [item.marker, new Tab()] }), ...toDocxRuns(item.runs)],
    alignment: AlignmentType.JUSTIFIED,
    indent: {
      left: cmToTwips(listTextIndentCm(item.depth)),
      hanging: cmToTwips(LIST_MARKER_WIDTH_CM),
    },
    spacing: bodySpacing,
  });
}

function toParagraphs(block: DocumentBlock): Paragraph[] {
  switch (block.type) {
    case "heading":
      return [headingParagraph(block.level, block.runs)];
    case "paragraph":
      return [bodyParagraph(block.runs)];
    case "list":
      return block.items.map(listItemParagraph);
  }
}

export async function renderDocx(blocks: DocumentBlock[]): Promise<Uint8Array> {
  const pageMargin = cmToTwips(PAGE_MARGIN_CM);
  const document = new Document({
    // Justified lines ending in a manual line break would otherwise be stretched across the page.
    compatibility: { doNotExpandShiftReturn: true },
    styles: {
      default: {
        document: { run: { font: DOCX_FONT, size: BODY_FONT_SIZE_PT * HALF_POINTS_PER_POINT } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: cmToTwips(PAGE_WIDTH_CM), height: cmToTwips(PAGE_HEIGHT_CM) },
            margin: { top: pageMargin, right: pageMargin, bottom: pageMargin, left: pageMargin },
          },
        },
        children: blocks.flatMap(toParagraphs),
      },
    ],
  });
  return Packer.toBuffer(document);
}
