import { DAILY_QUOTA_EXHAUSTED, type ErrorResponseInfo } from "@/lib/llm/errors";

/** Base and cap of the exponential backoff shared by the batch and task queues. */
export const QUEUE_RETRY_BASE_MS = 15_000;
export const QUEUE_RETRY_MAX_MS = 120_000;

const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_BAD_GATEWAY = 502;
const HTTP_SERVICE_UNAVAILABLE = 503;
const HTTP_GATEWAY_TIMEOUT = 504;
/** Rate limits and an overloaded, flaky or slow upstream are worth retrying; bad input and config errors are not. */
const RETRYABLE_STATUSES = new Set([
  HTTP_TOO_MANY_REQUESTS,
  HTTP_BAD_GATEWAY,
  HTTP_SERVICE_UNAVAILABLE,
  HTTP_GATEWAY_TIMEOUT,
]);

/** Exponential backoff: 15 s, 30 s, 60 s, 120 s (the cap). */
export function retryDelayMs(attempt: number): number {
  return Math.min(QUEUE_RETRY_BASE_MS * 2 ** (attempt - 1), QUEUE_RETRY_MAX_MS);
}

/** Whether a failure is transient. The free daily quota is a 429 too, but retrying it today never helps. */
export function isRetryableFailure(info: ErrorResponseInfo): boolean {
  return info !== DAILY_QUOTA_EXHAUSTED && RETRYABLE_STATUSES.has(info.status);
}
