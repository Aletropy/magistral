import { zipSync } from "fflate";
import { DEFAULT_FILE_BASENAME, EXPORT_FORMAT_INFO, slugify, type ExportFormat } from "@/lib/export/formats";
import { renderDocument } from "@/lib/export/renderDocument";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";
import type { FinishedBatchItem } from "./types";

/** Row numbers are zero-padded so files sort in spreadsheet order. */
const POSITION_DIGITS = 3;

export function batchFileName(item: Pick<FinishedBatchItem, "position" | "label">, format: ExportFormat): string {
  const position = String(item.position).padStart(POSITION_DIGITS, "0");
  return `${position}-${slugify(item.label) || DEFAULT_FILE_BASENAME}.${EXPORT_FORMAT_INFO[format].extension}`;
}

/** Renders every finished item with the regular exporters and zips them. */
export async function buildBatchZip(items: FinishedBatchItem[], format: ExportFormat): Promise<Uint8Array> {
  const entries: Record<string, Uint8Array> = {};
  for (const item of items) {
    entries[batchFileName(item, format)] = await renderDocument(parseMarkdown(item.markdown), format);
  }
  return zipSync(entries);
}

export function batchZipName(jobName: string, format: ExportFormat): string {
  return `${slugify(jobName) || "lote"}-${format}.zip`;
}
