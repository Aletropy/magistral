import "server-only";
import { GoogleGenAI } from "@google/genai";
import { LlmConfigurationError } from "../errors";
import { GEMINI_API_KEY_ENV_VAR } from "./config";

let client: GoogleGenAI | undefined;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env[GEMINI_API_KEY_ENV_VAR];
  if (!apiKey) {
    throw new LlmConfigurationError(`Environment variable ${GEMINI_API_KEY_ENV_VAR} is not set.`);
  }

  client ??= new GoogleGenAI({ apiKey });
  return client;
}
