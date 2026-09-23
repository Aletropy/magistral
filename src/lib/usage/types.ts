import type { LlmProvider } from "@/lib/llm/providers";

export const LLM_OPERATIONS = ["minuta"] as const;
export type LlmOperation = (typeof LLM_OPERATIONS)[number];

export const LLM_OPERATION_LABELS: Record<LlmOperation, string> = {
  minuta: "Geração de minuta",
};

/** "ok", a generation failure reason, or why the call never produced a response. */
export const LLM_CALL_STATUSES = [
  "ok",
  "refusal",
  "truncated",
  "empty",
  "configuration",
  "upstream",
] as const;
export type LlmCallStatus = (typeof LLM_CALL_STATUSES)[number];

export interface NewLlmCall {
  operation: LlmOperation;
  provider: LlmProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  latencyMs: number;
  /** Null when the model has no entry in the pricing table. */
  estimatedCostUsd: number | null;
  status: LlmCallStatus;
}

export interface LlmCall extends NewLlmCall {
  id: number;
  createdAt: string;
}

export interface UsageTotals {
  calls: number;
  failedCalls: number;
  inputTokens: number;
  /** Output plus thinking tokens: everything billed at the output rate. */
  outputTokens: number;
  costUsd: number;
  averageLatencyMs: number;
}

export interface UsageGroup extends UsageTotals {
  /** Day (YYYY-MM-DD, local time), operation or model, depending on the grouping. */
  key: string;
}
