import type { GoogleGenAI } from "@google/genai";
import type { MinutaGenerator } from "../types";
import { checkGeminiResponse } from "./checkResponse";
import { GEMINI_MAX_OUTPUT_TOKENS, GEMINI_MODEL } from "./config";

export function createGeminiGenerator(client: GoogleGenAI): MinutaGenerator {
  return async ({ system, user, temperature }, options = {}) => {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: user,
      config: {
        systemInstruction: system,
        temperature,
        maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
        abortSignal: options.signal,
      },
    });

    const usage = checkGeminiResponse(response);
    return { text: response.text ?? "", model: GEMINI_MODEL, usage };
  };
}
