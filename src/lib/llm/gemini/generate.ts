import { FinishReason, type GoogleGenAI } from "@google/genai";
import { MinutaGenerationError } from "../errors";
import type { MinutaGenerator } from "../types";
import { GEMINI_MAX_OUTPUT_TOKENS, GEMINI_MODEL } from "./config";

/** Finish reasons meaning Google's filters withheld the output. */
const BLOCKED_FINISH_REASONS = new Set<FinishReason>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
]);

export function createGeminiGenerator(client: GoogleGenAI): MinutaGenerator {
  return async ({ system, user }) => {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: user,
      config: { systemInstruction: system, maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS },
    });

    const finishReason = response.candidates?.[0]?.finishReason;
    if (response.promptFeedback?.blockReason || (finishReason && BLOCKED_FINISH_REASONS.has(finishReason))) {
      throw new MinutaGenerationError("refusal");
    }
    if (finishReason === FinishReason.MAX_TOKENS) throw new MinutaGenerationError("truncated");

    return response.text ?? "";
  };
}
