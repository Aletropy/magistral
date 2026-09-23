import type { DocumentBlock } from "@/lib/markdown/types";
import type { ExportFormat } from "./formats";
import { renderDocx } from "./renderDocx";
import { renderPdf } from "./renderPdf";

const RENDERERS: Record<ExportFormat, (blocks: DocumentBlock[]) => Promise<Uint8Array>> = {
  docx: renderDocx,
  pdf: renderPdf,
};

export function renderDocument(blocks: DocumentBlock[], format: ExportFormat): Promise<Uint8Array> {
  return RENDERERS[format](blocks);
}
