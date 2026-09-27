import "server-only";
import { getAnthropicClient } from "./anthropic/client";
import { ANTHROPIC_MODEL } from "./anthropic/config";
import { createAnthropicChatGenerator } from "./anthropic/generate";
import { getGeminiClient } from "./gemini/client";
import { GEMINI_MODEL } from "./gemini/config";
import { createGeminiChatGenerator } from "./gemini/generate";
import { getOpenRouterClient, getOpenRouterModels, getOpenRouterRouting } from "./openrouter/client";
import { createOpenRouterChatGenerator } from "./openrouter/generate";
import { LLM_PROVIDER_ENV_VAR, resolveLlmProvider, type LlmProvider } from "./providers";
import type { ChatGenerator } from "./types";

/** Clients are created on the first call, so a missing API key is thrown (and audited) then. */
export const CHAT_GENERATOR_FACTORIES: Record<LlmProvider, () => ChatGenerator> = {
  openrouter: () => createOpenRouterChatGenerator(getOpenRouterClient(), getOpenRouterModels(), getOpenRouterRouting()),
  gemini: () => createGeminiChatGenerator(getGeminiClient()),
  anthropic: () => createAnthropicChatGenerator(getAnthropicClient()),
};

/** Recorded when a call fails before the provider says which model answered. */
export const CONFIGURED_MODELS: Record<LlmProvider, () => string> = {
  openrouter: () => getOpenRouterModels()[0],
  gemini: () => GEMINI_MODEL,
  anthropic: () => ANTHROPIC_MODEL,
};

/** The drafting provider chosen by the LLM_PROVIDER env var. */
export function activeLlmProvider(): LlmProvider {
  return resolveLlmProvider(process.env[LLM_PROVIDER_ENV_VAR]);
}
