import { LLM_PROVIDERS } from "@/lib/llm/providers";

/** Who served a call: a drafting provider, or the local embedding model. */
export const USAGE_PROVIDERS = [...LLM_PROVIDERS, "local"] as const;
export type UsageProvider = (typeof USAGE_PROVIDERS)[number];

export const LLM_OPERATIONS = [
  "minuta",
  "batch",
  "playground",
  "style_capture",
  "embedding",
  "minuta_extract",
  "chat",
] as const;
export type LlmOperation = (typeof LLM_OPERATIONS)[number];

export const LLM_OPERATION_LABELS: Record<LlmOperation, string> = {
  minuta: "Geração de minuta",
  batch: "Geração em lote",
  playground: "Teste de persona",
  style_capture: "Captura de estilo",
  embedding: "Indexação da biblioteca",
  minuta_extract: "Preenchimento automático",
  chat: "Advogado IA",
};

/** "ok", a generation failure reason, or why the call never produced a response. */
export const LLM_CALL_STATUSES = [
  "ok",
  "refusal",
  "truncated",
  "empty",
  "invalid_output",
  "configuration",
  "upstream",
  "canceled",
] as const;
export type LlmCallStatus = (typeof LLM_CALL_STATUSES)[number];

export interface NewLlmCall {
  operation: LlmOperation;
  provider: UsageProvider;
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
