import { ApiError } from "@google/genai";
import { describe, expect, it } from "vitest";
import { DAILY_QUOTA_EXHAUSTED, RATE_LIMITED } from "../errors";
import { geminiErrorInfo } from "./errors";

describe("geminiErrorInfo", () => {
  it("tells the daily free-tier quota apart from a per-minute rate limit", () => {
    const daily = new ApiError({ status: 429, message: "quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier" });
    const perMinute = new ApiError({ status: 429, message: "quotaId: GenerateRequestsPerMinutePerProjectPerModel-FreeTier" });
    expect(geminiErrorInfo(daily)).toBe(DAILY_QUOTA_EXHAUSTED);
    expect(geminiErrorInfo(perMinute)).toBe(RATE_LIMITED);
    expect(geminiErrorInfo(new Error("other"))).toBeNull();
  });
});
