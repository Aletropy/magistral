import { unzipSync } from "fflate";

/** A DOCX is a ZIP; past this uncompressed size (or entry count) it is treated as a decompression bomb. */
export const MAX_DOCX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
export const MAX_DOCX_ENTRIES = 2000;

/**
 * Whether a ZIP's entries, as its directory declares them, stay within the limits. Nothing is inflated:
 * the filter only reads each entry's declared size and skips it.
 */
export function isZipWithinLimits(bytes: Uint8Array): boolean {
  let totalBytes = 0;
  let entries = 0;
  try {
    unzipSync(bytes, {
      filter(file) {
        totalBytes += file.originalSize;
        entries++;
        return false;
      },
    });
  } catch {
    // Not a readable ZIP: the extractor reports it as unreadable.
    return true;
  }
  return totalBytes <= MAX_DOCX_UNCOMPRESSED_BYTES && entries <= MAX_DOCX_ENTRIES;
}
