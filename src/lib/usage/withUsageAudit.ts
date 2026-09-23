import { LlmConfigurationError, MinutaGenerationError } from "@/lib/llm/errors";
import type { LlmProvider } from "@/lib/llm/providers";
import { NO_USAGE, type MinutaGenerator, type TokenUsage } from "@/lib/llm/types";
import { estimateCostUsd } from "./pricing";
import type { LlmCallStatus, LlmOperation, NewLlmCall } from "./types";

export interface UsageAuditOptions {
  operation: LlmOperation;
  provider: LlmProvider;
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

/** Wraps a generator so every call, successful or not, is logged with tokens, latency and cost. */
export function withUsageAudit(generate: MinutaGenerator, options: UsageAuditOptions): MinutaGenerator {
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

  return async (prompt) => {
    const startedAt = now();
    try {
      const result = await generate(prompt);
      safeRecord(result.model, result.usage, startedAt, "ok");
      return result;
    } catch (error) {
      const usage = error instanceof MinutaGenerationError ? (error.usage ?? NO_USAGE) : NO_USAGE;
      safeRecord(configuredModel, usage, startedAt, failureStatus(error));
      throw error;
    }
  };
}
