import {
  CONFIGURATION_ERROR,
  DAILY_QUOTA_EXHAUSTED,
  UPSTREAM_TIMEOUT,
  errorInfoForUpstreamStatus,
  type ErrorResponseInfo,
} from "../errors";
import { OpenRouterApiError } from "./api";

const HTTP_PAYMENT_REQUIRED = 402;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_GATEWAY_TIMEOUT = 504;
/** OpenRouter's free-tier daily cap message, e.g. "Rate limit exceeded: free-models-per-day". */
const DAILY_LIMIT = /per[-\s]?day/i;

/** Maps OpenRouter errors; returns null for anything the client didn't raise. */
export function openRouterErrorInfo(error: unknown): ErrorResponseInfo | null {
  if (!(error instanceof OpenRouterApiError)) return null;
  if (error.status === HTTP_PAYMENT_REQUIRED) return CONFIGURATION_ERROR;
  if (error.status === HTTP_GATEWAY_TIMEOUT) return UPSTREAM_TIMEOUT;
  if (error.status === HTTP_TOO_MANY_REQUESTS && DAILY_LIMIT.test(error.message)) return DAILY_QUOTA_EXHAUSTED;
  return errorInfoForUpstreamStatus(error.status);
}
