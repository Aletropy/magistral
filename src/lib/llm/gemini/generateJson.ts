import type { GoogleGenAI } from "@google/genai";
import type { StructuredGenerator } from "../types";
import { checkGeminiResponse } from "./checkResponse";
import { STRUCTURED_OUTPUT_MAX_TOKENS, STRUCTURED_OUTPUT_MODEL } from "./config";

/** Asks Gemini for JSON following a schema (`responseJsonSchema`). */
export function createGeminiJsonGenerator(client: GoogleGenAI): StructuredGenerator {
  return async ({ system, user, temperature }, { schema }, options = {}) => {
    const response = await client.models.generateContent({
      model: STRUCTURED_OUTPUT_MODEL,
      contents: user,
      config: {
        systemInstruction: system,
        temperature,
        maxOutputTokens: STRUCTURED_OUTPUT_MAX_TOKENS,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        abortSignal: options.signal,
      },
    });
    const usage = checkGeminiResponse(response);
    return { text: response.text ?? "", model: STRUCTURED_OUTPUT_MODEL, usage };
  };
}
