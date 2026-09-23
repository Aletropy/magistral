export type DocumentExtractionFailure = "unsupported_type" | "too_large" | "too_long" | "no_text" | "unreadable";

export class DocumentExtractionError extends Error {
  readonly reason: DocumentExtractionFailure;

  constructor(reason: DocumentExtractionFailure, cause?: unknown) {
    super(`Document text extraction failed: ${reason}`, { cause });
    this.name = "DocumentExtractionError";
    this.reason = reason;
  }
}
