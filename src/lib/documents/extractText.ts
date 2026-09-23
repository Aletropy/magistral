import mammoth from "mammoth";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";
import { DocumentExtractionError } from "./errors";
import { MAX_UPLOAD_BYTES, detectDocumentFormat, type DocumentFormat } from "./formats";

/** Below this many characters a PDF is treated as scanned (no text layer). */
export const MIN_EXTRACTED_CHARS = 100;

const THREE_OR_MORE_NEWLINES = /\n{3,}/g;
const TRAILING_SPACES = /[ \t]+\n/g;

export interface UploadedDocument {
  name: string;
  bytes: Uint8Array;
}

const EXTRACTORS: Record<DocumentFormat, (bytes: Uint8Array) => Promise<string>> = {
  async pdf(bytes) {
    // pdf.js may detach the buffer it reads, so give it a copy.
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return text;
  },
  async docx(bytes) {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return value;
  },
};

function tidy(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(TRAILING_SPACES, "\n").replace(THREE_OR_MORE_NEWLINES, "\n\n").trim();
}

/** Returns the plain text of a PDF or DOCX, or throws a DocumentExtractionError. */
export async function extractText(document: UploadedDocument): Promise<string> {
  const format = detectDocumentFormat(document.name);
  if (!format) throw new DocumentExtractionError("unsupported_type");
  if (document.bytes.byteLength > MAX_UPLOAD_BYTES) throw new DocumentExtractionError("too_large");

  let text: string;
  try {
    text = tidy(await EXTRACTORS[format](document.bytes));
  } catch (error) {
    throw new DocumentExtractionError("unreadable", error);
  }
  if (text.length < MIN_EXTRACTED_CHARS) throw new DocumentExtractionError("no_text");
  return text;
}
