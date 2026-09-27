import { FinishReason, type GenerateContentResponse } from "@google/genai";
import { LlmOutputError } from "../errors";
import type { TokenUsage } from "../types";

/** Finish reasons meaning Google's filters withheld the output. */
const BLOCKED_FINISH_REASONS = new Set<FinishReason>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
]);

/** Returns the billed usage, or throws a LlmOutputError when the output was blocked or cut off. */
export function checkGeminiResponse(response: GenerateContentResponse): TokenUsage {
  const metadata = response.usageMetadata;
  const usage: TokenUsage = {
    inputTokens: metadata?.promptTokenCount ?? 0,
    outputTokens: metadata?.candidatesTokenCount ?? 0,
    thinkingTokens: metadata?.thoughtsTokenCount ?? 0,
  };

  const finishReason = response.candidates?.[0]?.finishReason;
  if (response.promptFeedback?.blockReason || (finishReason && BLOCKED_FINISH_REASONS.has(finishReason))) {
    throw new LlmOutputError("refusal", usage);
  }
  if (finishReason === FinishReason.MAX_TOKENS) throw new LlmOutputError("truncated", usage);
  return usage;
}
