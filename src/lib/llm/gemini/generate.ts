import { FinishReason, type GenerateContentResponseUsageMetadata, type GoogleGenAI } from "@google/genai";
import { MinutaGenerationError } from "../errors";
import type { MinutaGenerator, TokenUsage } from "../types";
import { GEMINI_MAX_OUTPUT_TOKENS, GEMINI_MODEL } from "./config";

/** Finish reasons meaning Google's filters withheld the output. */
const BLOCKED_FINISH_REASONS = new Set<FinishReason>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
]);

function toTokenUsage(metadata: GenerateContentResponseUsageMetadata | undefined): TokenUsage {
  return {
    inputTokens: metadata?.promptTokenCount ?? 0,
    outputTokens: metadata?.candidatesTokenCount ?? 0,
    thinkingTokens: metadata?.thoughtsTokenCount ?? 0,
  };
}

export function createGeminiGenerator(client: GoogleGenAI): MinutaGenerator {
  return async ({ system, user, temperature }) => {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: user,
      config: { systemInstruction: system, temperature, maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS },
    });

    const usage = toTokenUsage(response.usageMetadata);
    const finishReason = response.candidates?.[0]?.finishReason;
    if (response.promptFeedback?.blockReason || (finishReason && BLOCKED_FINISH_REASONS.has(finishReason))) {
      throw new MinutaGenerationError("refusal", usage);
    }
    if (finishReason === FinishReason.MAX_TOKENS) throw new MinutaGenerationError("truncated", usage);

    return { text: response.text ?? "", model: GEMINI_MODEL, usage };
  };
}
