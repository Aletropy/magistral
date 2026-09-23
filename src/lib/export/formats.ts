import { toPlainText } from "@/lib/markdown/parseMarkdown";
import type { DocumentBlock } from "@/lib/markdown/types";

export const EXPORT_FORMATS = ["docx", "pdf"] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export interface ExportFormatInfo {
  label: string;
  mimeType: string;
  extension: string;
}

export const EXPORT_FORMAT_INFO: Record<ExportFormat, ExportFormatInfo> = {
  docx: {
    label: "Word (.docx)",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
  },
  pdf: { label: "PDF", mimeType: "application/pdf", extension: "pdf" },
};

export const DEFAULT_FILE_BASENAME = "minuta";
const MAX_FILE_BASENAME_CHARS = 80;
const COMBINING_DIACRITICS = /[̀-ͯ]/g;
const NON_ALPHANUMERIC_RUN = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_RUN, "-")
    .slice(0, MAX_FILE_BASENAME_CHARS)
    .replace(EDGE_DASHES, "");
}

/** Builds an ASCII file name from the document's first heading, e.g. "contrato-de-locacao.pdf". */
export function buildFileName(blocks: DocumentBlock[], format: ExportFormat): string {
  const title = blocks.find((block) => block.type === "heading");
  const baseName = (title && slugify(toPlainText(title.runs))) || DEFAULT_FILE_BASENAME;
  return `${baseName}.${EXPORT_FORMAT_INFO[format].extension}`;
}
