import { DocumentExtractionError } from "@/lib/documents/errors";
import { DOCUMENT_EXTRACTION_ERRORS } from "@/lib/documents/messages";
import type { ErrorResponseInfo } from "@/lib/llm/errors";
import { describeDraftingFailure } from "@/lib/minuta/errors";

/** Maps any failure a task can hit to a status and a pt-BR message safe to show the user. */
export function describeTaskFailure(error: unknown): ErrorResponseInfo {
  if (error instanceof DocumentExtractionError) return DOCUMENT_EXTRACTION_ERRORS[error.reason];
  return describeDraftingFailure(error);
}
