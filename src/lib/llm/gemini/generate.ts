import type { GoogleGenAI } from "@google/genai";
import type { ChatGenerator, ChatTurn } from "../types";
import { checkGeminiResponse } from "./checkResponse";
import { GEMINI_MAX_OUTPUT_TOKENS, GEMINI_MODEL } from "./config";

/** Gemini calls the assistant's turns "model". */
const GEMINI_ROLES: Record<ChatTurn["role"], string> = { user: "user", assistant: "model" };

export function createGeminiChatGenerator(client: GoogleGenAI): ChatGenerator {
  return async ({ system, messages, temperature }, options = {}) => {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: messages.map((turn) => ({ role: GEMINI_ROLES[turn.role], parts: [{ text: turn.content }] })),
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
