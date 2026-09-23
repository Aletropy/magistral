import { describe, expect, it } from "vitest";
import { UNKNOWN_COST_LABEL, formatDay, formatLatency, formatUsd } from "./format";

describe("usage formatting", () => {
  it("shows sub-cent costs with four decimals and unknown costs as a dash", () => {
    expect(formatUsd(0.0123)).toMatch(/0,0123/);
    expect(formatUsd(null)).toBe(UNKNOWN_COST_LABEL);
  });

  it("shows latency in seconds", () => {
    expect(formatLatency(4250)).toBe("4,3 s");
  });

  it("formats a day key as the same calendar day", () => {
    expect(formatDay("2026-09-23")).toBe("23/09/2026");
  });
});
