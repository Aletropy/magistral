import "server-only";
import { getAnthropicClient } from "./anthropic/client";
import { createAnthropicGenerator } from "./anthropic/generate";
import { getGeminiClient } from "./gemini/client";
import { createGeminiGenerator } from "./gemini/generate";
import { LLM_PROVIDER_ENV_VAR, resolveLlmProvider, type LlmProvider } from "./providers";
import type { MinutaGenerator } from "./types";

const GENERATOR_FACTORIES: Record<LlmProvider, () => MinutaGenerator> = {
  gemini: () => createGeminiGenerator(getGeminiClient()),
  anthropic: () => createAnthropicGenerator(getAnthropicClient()),
};

/** Returns the generator for the provider chosen by the LLM_PROVIDER env var. */
export function getMinutaGenerator(): MinutaGenerator {
  return GENERATOR_FACTORIES[resolveLlmProvider(process.env[LLM_PROVIDER_ENV_VAR])]();
}
