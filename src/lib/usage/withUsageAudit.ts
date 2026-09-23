import { LlmConfigurationError, MinutaGenerationError } from "@/lib/llm/errors";
import { NO_USAGE, type TokenUsage } from "@/lib/llm/types";
import { estimateCostUsd } from "./pricing";
import type { LlmCallStatus, LlmOperation, NewLlmCall, UsageProvider } from "./types";

export interface UsageAuditOptions {
  operation: LlmOperation;
  provider: UsageProvider;
  /** Recorded when the call fails before the provider reports which model answered. */
  configuredModel: string;
  record: (call: NewLlmCall) => void;
  /** Millisecond clock; injectable for tests. */
  now?: () => number;
}

function failureStatus(error: unknown): LlmCallStatus {
  if (error instanceof MinutaGenerationError) return error.reason;
  if (error instanceof LlmConfigurationError) return "configuration";
  return "upstream";
}

/** Any LLM call result that reports which model answered and what it billed. */
export interface AuditedResult {
  model: string;
  usage: TokenUsage;
}

/** Wraps an LLM call so every invocation, successful or not, is logged with tokens, latency and cost. */
export function withUsageAudit<Args extends unknown[], Result extends AuditedResult>(
  call: (...args: Args) => Promise<Result>,
  options: UsageAuditOptions,
): (...args: Args) => Promise<Result> {
  const { operation, provider, configuredModel, record, now = () => performance.now() } = options;

  function safeRecord(model: string, usage: TokenUsage, startedAt: number, status: LlmCallStatus) {
    try {
      record({
        operation,
        provider,
        model,
        ...usage,
        latencyMs: Math.round(now() - startedAt),
        estimatedCostUsd: estimateCostUsd(model, usage),
        status,
      });
    } catch (error) {
      // Auditing must never break the generation it observes.
      console.error("[usage] failed to record LLM call", error);
    }
  }

  return async (...args) => {
    const startedAt = now();
    try {
      const result = await call(...args);
      safeRecord(result.model, result.usage, startedAt, "ok");
      return result;
    } catch (error) {
      const usage = error instanceof MinutaGenerationError ? (error.usage ?? NO_USAGE) : NO_USAGE;
      safeRecord(configuredModel, usage, startedAt, failureStatus(error));
      throw error;
    }
  };
}
