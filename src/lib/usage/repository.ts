import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import {
  LLM_CALL_STATUSES,
  LLM_OPERATIONS,
  USAGE_PROVIDERS,
  type LlmCall,
  type LlmOperation,
  type NewLlmCall,
  type UsageGroup,
  type UsageProvider,
  type UsageTotals,
} from "./types";

const llmCallRowSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  operation: z.enum(LLM_OPERATIONS),
  provider: z.enum(USAGE_PROVIDERS),
  model: z.string(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  thinking_tokens: z.number(),
  latency_ms: z.number(),
  estimated_cost_usd: z.number().nullable(),
  status: z.enum(LLM_CALL_STATUSES),
});

const totalsRowSchema = z.object({
  key: z.string().optional(),
  calls: z.number(),
  failed_calls: z.number().nullable(),
  input_tokens: z.number().nullable(),
  output_tokens: z.number().nullable(),
  cost_usd: z.number().nullable(),
  average_latency_ms: z.number().nullable(),
});

const TOTALS_COLUMNS = `
  COUNT(*) AS calls,
  SUM(status <> 'ok') AS failed_calls,
  SUM(input_tokens) AS input_tokens,
  SUM(output_tokens + thinking_tokens) AS output_tokens,
  SUM(estimated_cost_usd) AS cost_usd,
  AVG(latency_ms) AS average_latency_ms`;

const SINCE_FILTER = "created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?)";

export type UsageGrouping = "day" | "operation" | "model" | "user";
/** The key of calls made outside any user's request (none are expected, but old rows may lack a user). */
export const NO_USER_KEY = "";

const GROUP_EXPRESSIONS: Record<UsageGrouping, string> = {
  day: "date(created_at, 'localtime')",
  operation: "operation",
  model: "model",
  user: `COALESCE((SELECT display_name FROM users WHERE users.id = llm_calls.user_id), '${NO_USER_KEY}')`,
};

export interface UsageRepository {
  /** `userId` is who the call was made for; null outside a request or task. */
  record(call: NewLlmCall, userId: string | null): void;
  totals(sinceDays: number): UsageTotals;
  /** Days sort newest first; operations and models sort by cost. */
  groupedTotals(grouping: UsageGrouping, sinceDays: number): UsageGroup[];
  recent(limit: number): LlmCall[];
  /** Calls to a provider since a moment, e.g. to see how much of a daily quota is left. */
  countCallsSince(provider: UsageProvider, since: Date, model?: string): number;
  /** Mean latency of successful calls of these operations in the last days, or null without data. */
  averageLatencyMs(operations: readonly LlmOperation[], sinceDays: number): number | null;
}

function daysAgoModifier(days: number): string {
  return `-${days} days`;
}

function toTotals(row: unknown): UsageTotals {
  const parsed = totalsRowSchema.parse(row);
  return {
    calls: parsed.calls,
    failedCalls: parsed.failed_calls ?? 0,
    inputTokens: parsed.input_tokens ?? 0,
    outputTokens: parsed.output_tokens ?? 0,
    costUsd: parsed.cost_usd ?? 0,
    averageLatencyMs: parsed.average_latency_ms ?? 0,
  };
}

export function createUsageRepository(db: DatabaseSync): UsageRepository {
  const insert = db.prepare(
    `INSERT INTO llm_calls (operation, provider, model, input_tokens, output_tokens, thinking_tokens,
                            latency_ms, estimated_cost_usd, status, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const selectTotals = db.prepare(`SELECT ${TOTALS_COLUMNS} FROM llm_calls WHERE ${SINCE_FILTER}`);
  const selectRecent = db.prepare("SELECT * FROM llm_calls ORDER BY id DESC LIMIT ?");
  const countSince = db.prepare("SELECT COUNT(*) AS count FROM llm_calls WHERE provider = ? AND created_at >= ?");
  // Calls the service answered; a refused one (e.g. past the daily limit) doesn't use the allowance.
  const countModelSince = db.prepare(
    "SELECT COUNT(*) AS count FROM llm_calls WHERE provider = ? AND created_at >= ? AND model = ? AND status = 'ok'",
  );

  return {
    record(call, userId) {
      insert.run(
        call.operation,
        call.provider,
        call.model,
        call.inputTokens,
        call.outputTokens,
        call.thinkingTokens,
        call.latencyMs,
        call.estimatedCostUsd,
        call.status,
        userId,
      );
    },

    totals: (sinceDays) => toTotals(selectTotals.get(daysAgoModifier(sinceDays))),

    groupedTotals(grouping, sinceDays) {
      const order = grouping === "day" ? "key DESC" : "cost_usd DESC, calls DESC";
      const rows = db
        .prepare(
          `SELECT ${GROUP_EXPRESSIONS[grouping]} AS key, ${TOTALS_COLUMNS}
           FROM llm_calls WHERE ${SINCE_FILTER} GROUP BY key ORDER BY ${order}`,
        )
        .all(daysAgoModifier(sinceDays));
      return rows.map((row) => ({ key: totalsRowSchema.parse(row).key ?? "", ...toTotals(row) }));
    },

    countCallsSince: (provider, since, model) =>
      z
        .object({ count: z.number() })
        .parse(
          model === undefined
            ? countSince.get(provider, since.toISOString())
            : countModelSince.get(provider, since.toISOString(), model),
        ).count,
    averageLatencyMs(operations, sinceDays) {
      const placeholders = operations.map(() => "?").join(", ");
      const row = db
        .prepare(
          `SELECT AVG(latency_ms) AS average FROM llm_calls
           WHERE status = 'ok' AND operation IN (${placeholders}) AND ${SINCE_FILTER}`,
        )
        .get(...operations, daysAgoModifier(sinceDays));
      return z.object({ average: z.number().nullable() }).parse(row).average;
    },
    recent: (limit) =>
      selectRecent.all(limit).map((row) => {
        const parsed = llmCallRowSchema.parse(row);
        return {
          id: parsed.id,
          createdAt: parsed.created_at,
          operation: parsed.operation,
          provider: parsed.provider,
          model: parsed.model,
          inputTokens: parsed.input_tokens,
          outputTokens: parsed.output_tokens,
          thinkingTokens: parsed.thinking_tokens,
          latencyMs: parsed.latency_ms,
          estimatedCostUsd: parsed.estimated_cost_usd,
          status: parsed.status,
        };
      }),
  };
}
