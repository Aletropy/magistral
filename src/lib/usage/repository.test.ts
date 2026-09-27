import type { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { insertTestUser } from "@/lib/auth/testHelpers";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import { NO_USER_KEY, createUsageRepository, type UsageRepository } from "./repository";
import type { NewLlmCall } from "./types";

const DAYS = 30;

const CALL: NewLlmCall = {
  operation: "minuta",
  provider: "gemini",
  model: "gemini-2.5-flash",
  inputTokens: 1000,
  outputTokens: 2000,
  thinkingTokens: 500,
  latencyMs: 4000,
  estimatedCostUsd: 0.01,
  status: "ok",
};

describe("createUsageRepository", () => {
  let db: DatabaseSync;
  let usage: UsageRepository;

  beforeEach(() => {
    db = openDatabase(IN_MEMORY_DATABASE);
    usage = createUsageRepository(db);
  });

  it("returns zero totals when nothing was recorded", () => {
    expect(usage.totals(DAYS)).toEqual({
      calls: 0,
      failedCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      averageLatencyMs: 0,
    });
  });

  it("sums tokens (thinking counted as output), cost and failures", () => {
    usage.record(CALL, null);
    usage.record({ ...CALL, status: "upstream", inputTokens: 0, outputTokens: 0, thinkingTokens: 0, estimatedCostUsd: 0, latencyMs: 2000 }, null);

    expect(usage.totals(DAYS)).toEqual({
      calls: 2,
      failedCalls: 1,
      inputTokens: 1000,
      outputTokens: 2500,
      costUsd: 0.01,
      averageLatencyMs: 3000,
    });
  });

  it("ignores calls older than the window", () => {
    usage.record(CALL, null);
    db.exec("UPDATE llm_calls SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-40 days')");
    expect(usage.totals(DAYS).calls).toBe(0);
  });

  it("groups by model, most expensive first, and lists recent calls newest first", () => {
    usage.record(CALL, null);
    usage.record({ ...CALL, provider: "anthropic", model: "claude-opus-5", estimatedCostUsd: 0.2 }, null);

    expect(usage.groupedTotals("model", DAYS).map((group) => group.key)).toEqual([
      "claude-opus-5",
      "gemini-2.5-flash",
    ]);
    expect(usage.recent(10).map((call) => call.model)).toEqual(["claude-opus-5", "gemini-2.5-flash"]);
  });

  it("groups by the user each call was made for", () => {
    const ana = insertTestUser(db, "ana");
    usage.record({ ...CALL, estimatedCostUsd: 0.5 }, ana);
    usage.record(CALL, null);

    expect(usage.groupedTotals("user", DAYS).map((group) => [group.key, group.calls])).toEqual([
      ["ana", 1],
      [NO_USER_KEY, 1],
    ]);
  });

  it("groups by local day", () => {
    usage.record(CALL, null);
    const [day] = usage.groupedTotals("day", DAYS);
    expect(day.key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(day.calls).toBe(1);
  });
});
