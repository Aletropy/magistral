export const DOCUMENT_FORMATS = ["pdf", "docx"] as const;
export type DocumentFormat = (typeof DOCUMENT_FORMATS)[number];

export const MEBIBYTE = 1024 * 1024;
export const MAX_UPLOAD_MEBIBYTES = 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MEBIBYTES * MEBIBYTE;
export const MAX_FILES_PER_UPLOAD = 20;
/** Room for multipart boundaries, headers and small text fields around the uploaded files. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
/** The largest request a single-document upload (style capture, text extraction) may send. */
export const MAX_SINGLE_UPLOAD_REQUEST_BYTES = MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES;
/** The largest request a library upload may send: every file at the size limit. */
export const MAX_LIBRARY_UPLOAD_REQUEST_BYTES = MAX_FILES_PER_UPLOAD * MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES;

/** Past this length a Style Capture document is rejected rather than silently cut. */
export const MAX_DOCUMENT_TEXT_CHARS = 400_000;

/** Library documents are chunked, so they can be longer (a full municipal tax code fits). */
export const MAX_LIBRARY_DOCUMENT_CHARS = 2_000_000;

const EXTENSIONS: Record<DocumentFormat, string> = { pdf: ".pdf", docx: ".docx" };

/** The value for an <input type="file"> accept attribute. */
export const DOCUMENT_ACCEPT = DOCUMENT_FORMATS.map((format) => EXTENSIONS[format]).join(",");

/** Detects the format from the file name; browsers report DOCX MIME types inconsistently. */
export function detectDocumentFormat(fileName: string): DocumentFormat | null {
  const lowerName = fileName.toLowerCase();
  return DOCUMENT_FORMATS.find((format) => lowerName.endsWith(EXTENSIONS[format])) ?? null;
}
