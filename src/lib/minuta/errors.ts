import { HTTP_BAD_REQUEST } from "@/lib/http/api";
import type { ErrorResponseInfo } from "@/lib/llm/errors";
import { toErrorResponseInfo } from "@/lib/llm/toErrorResponseInfo";

/** The request points at data that doesn't exist (persona, clauses) or can't be used (empty library). */
export class MinutaRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MinutaRequestError";
  }
}

/** Maps any drafting failure to an HTTP status and a pt-BR message safe to show the user. */
export function describeDraftingFailure(error: unknown): ErrorResponseInfo {
  if (error instanceof MinutaRequestError) return { status: HTTP_BAD_REQUEST, message: error.message };
  return toErrorResponseInfo(error);
}
