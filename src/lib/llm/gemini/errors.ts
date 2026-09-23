import { ApiError } from "@google/genai";
import { DAILY_QUOTA_EXHAUSTED, errorInfoForUpstreamStatus, type ErrorResponseInfo } from "../errors";

const HTTP_TOO_MANY_REQUESTS = 429;
/** Free-tier daily caps carry quota ids like "GenerateRequestsPerDayPerProjectPerModel-FreeTier". */
const DAILY_QUOTA = /PerDay/;

/** Maps Gemini SDK errors; returns null for anything the SDK didn't raise. */
export function geminiErrorInfo(error: unknown): ErrorResponseInfo | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === HTTP_TOO_MANY_REQUESTS && DAILY_QUOTA.test(error.message)) return DAILY_QUOTA_EXHAUSTED;
  return errorInfoForUpstreamStatus(error.status);
}
