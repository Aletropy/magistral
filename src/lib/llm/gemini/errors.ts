import { ApiError } from "@google/genai";
import { errorInfoForUpstreamStatus, type ErrorResponseInfo } from "../errors";

/** Maps Gemini SDK errors; returns null for anything the SDK didn't raise. */
export function geminiErrorInfo(error: unknown): ErrorResponseInfo | null {
  return error instanceof ApiError ? errorInfoForUpstreamStatus(error.status) : null;
}
