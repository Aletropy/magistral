import { zipSync } from "fflate";
import { DEFAULT_FILE_BASENAME, EXPORT_FORMAT_INFO, slugify, type ExportFormat } from "@/lib/export/formats";
import { renderDocument } from "@/lib/export/renderDocument";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";
import type { FinishedBatchItem } from "./types";

/** fflate's "store" level: no compression pass over files that are compressed already. */
const STORE_WITHOUT_COMPRESSION = 0;

/** Row numbers are zero-padded so files sort in spreadsheet order. */
const POSITION_DIGITS = 3;

export function batchFileName(item: Pick<FinishedBatchItem, "position" | "label">, format: ExportFormat): string {
  const position = String(item.position).padStart(POSITION_DIGITS, "0");
  return `${position}-${slugify(item.label) || DEFAULT_FILE_BASENAME}.${EXPORT_FORMAT_INFO[format].extension}`;
}

/** Lets queued requests and timers run between documents, so a 200-file ZIP doesn't freeze the server. */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Renders every finished item with the regular exporters and zips them. Rendering is CPU work, so the
 * event loop gets a turn after each document. The files are already compressed (DOCX is a ZIP, PDF
 * streams are deflated), so they are stored as is.
 */
export async function buildBatchZip(items: FinishedBatchItem[], format: ExportFormat): Promise<Uint8Array> {
  const entries: Record<string, Uint8Array> = {};
  for (const item of items) {
    entries[batchFileName(item, format)] = await renderDocument(parseMarkdown(item.markdown), format);
    await yieldToEventLoop();
  }
  return zipSync(entries, { level: STORE_WITHOUT_COMPRESSION });
}

export function batchZipName(jobName: string, format: ExportFormat): string {
  return `${slugify(jobName) || "lote"}-${format}.zip`;
}
