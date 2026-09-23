import type { TokenUsage } from "@/lib/llm/types";

export interface ModelPricing {
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
}

const TOKENS_PER_MILLION = 1_000_000;

/**
 * Standard paid-tier list prices, checked on 2026-09-23 against ai.google.dev/gemini-api/docs/pricing
 * and Anthropic's model table. Claude refusal fallbacks may answer with claude-opus-4-8.
 */
export const MODEL_PRICING: Readonly<Record<string, ModelPricing>> = {
  "gemini-2.5-flash": { inputUsdPerMTok: 0.3, outputUsdPerMTok: 2.5 },
  "gemini-embedding-2": { inputUsdPerMTok: 0.2, outputUsdPerMTok: 0 },
  "claude-opus-5": { inputUsdPerMTok: 5, outputUsdPerMTok: 25 },
  "claude-opus-4-8": { inputUsdPerMTok: 5, outputUsdPerMTok: 25 },
};

/** OpenRouter's free variants end in ":free"; models run on this machine are "local/…". Both cost nothing. */
const FREE_MODEL_SUFFIX = ":free";
const LOCAL_MODEL_PREFIX = "local/";

/** Estimated USD cost of one call; thinking tokens are billed at the output rate. Null for unknown models. */
export function estimateCostUsd(model: string, usage: TokenUsage): number | null {
  if (model.endsWith(FREE_MODEL_SUFFIX) || model.startsWith(LOCAL_MODEL_PREFIX)) return 0;
  const pricing = MODEL_PRICING[model];
  if (!pricing) return null;

  const billedOutput = usage.outputTokens + usage.thinkingTokens;
  return (
    (usage.inputTokens * pricing.inputUsdPerMTok + billedOutput * pricing.outputUsdPerMTok) /
    TOKENS_PER_MILLION
  );
}
