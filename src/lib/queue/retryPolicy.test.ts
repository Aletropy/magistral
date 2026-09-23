import { describe, expect, it } from "vitest";
import { DAILY_QUOTA_EXHAUSTED, RATE_LIMITED, SERVICE_UNAVAILABLE, UPSTREAM_TIMEOUT } from "@/lib/llm/errors";
import { isRetryableFailure, QUEUE_RETRY_MAX_MS, retryDelayMs } from "./retryPolicy";

describe("retry policy", () => {
  it("doubles the delay up to the cap", () => {
    expect([1, 2, 3, 4, 5].map(retryDelayMs)).toEqual([15_000, 30_000, 60_000, 120_000, QUEUE_RETRY_MAX_MS]);
  });

  it("retries rate limits and upstream outages but not the exhausted daily quota", () => {
    expect(isRetryableFailure(RATE_LIMITED)).toBe(true);
    expect(isRetryableFailure(SERVICE_UNAVAILABLE)).toBe(true);
    expect(isRetryableFailure(UPSTREAM_TIMEOUT)).toBe(true);
    expect(isRetryableFailure(DAILY_QUOTA_EXHAUSTED)).toBe(false);
    expect(isRetryableFailure({ status: 400, message: "x" })).toBe(false);
  });
});
