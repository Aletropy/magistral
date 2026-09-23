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
  "claude-opus-5": { inputUsdPerMTok: 5, outputUsdPerMTok: 25 },
  "claude-opus-4-8": { inputUsdPerMTok: 5, outputUsdPerMTok: 25 },
};

/** Estimated USD cost of one call; thinking tokens are billed at the output rate. Null for unknown models. */
export function estimateCostUsd(model: string, usage: TokenUsage): number | null {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return null;

  const billedOutput = usage.outputTokens + usage.thinkingTokens;
  return (
    (usage.inputTokens * pricing.inputUsdPerMTok + billedOutput * pricing.outputUsdPerMTok) /
    TOKENS_PER_MILLION
  );
}
