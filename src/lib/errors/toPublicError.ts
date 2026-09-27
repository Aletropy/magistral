import { DocumentExtractionError } from "@/lib/documents/errors";
import { DOCUMENT_EXTRACTION_ERRORS } from "@/lib/documents/messages";
import type { ErrorResponseInfo } from "@/lib/llm/errors";
import { toErrorResponseInfo } from "@/lib/llm/toErrorResponseInfo";
import { AppError } from "./AppError";

/** Maps any failure (app, document or LLM) to a status and a pt-BR message that never leaks internals. */
export function toPublicError(error: unknown): ErrorResponseInfo {
  if (error instanceof AppError) return { status: error.status, message: error.message };
  if (error instanceof DocumentExtractionError) return DOCUMENT_EXTRACTION_ERRORS[error.reason];
  return toErrorResponseInfo(error);
}
