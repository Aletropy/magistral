import { HTTP_BAD_REQUEST, HTTP_CONFLICT } from "@/lib/http/api";
import type { ErrorResponseInfo } from "@/lib/llm/errors";
import { toErrorResponseInfo } from "@/lib/llm/toErrorResponseInfo";
import { LibraryIndexMismatchError } from "@/lib/rag/errors";

/** The request points at data that doesn't exist (persona, clauses) or can't be used (empty library). */
export class MinutaRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MinutaRequestError";
  }
}

/** Maps any drafting or library failure to an HTTP status and a pt-BR message safe to show the user. */
export function describeDraftingFailure(error: unknown): ErrorResponseInfo {
  if (error instanceof MinutaRequestError) return { status: HTTP_BAD_REQUEST, message: error.message };
  if (error instanceof LibraryIndexMismatchError) return { status: HTTP_CONFLICT, message: error.message };
  return toErrorResponseInfo(error);
}
