import "server-only";
import { getUsageRepository } from "@/lib/usage/getUsageRepository";
import type { LlmOperation } from "@/lib/usage/types";
import { withUsageAudit } from "@/lib/usage/withUsageAudit";
import { getAnthropicClient } from "./anthropic/client";
import { ANTHROPIC_MODEL } from "./anthropic/config";
import { createAnthropicGenerator } from "./anthropic/generate";
import { getGeminiClient } from "./gemini/client";
import { GEMINI_MODEL } from "./gemini/config";
import { createGeminiGenerator } from "./gemini/generate";
import { getOpenRouterClient, getOpenRouterModels } from "./openrouter/client";
import { createOpenRouterGenerator } from "./openrouter/generate";
import { LLM_PROVIDER_ENV_VAR, resolveLlmProvider, type LlmProvider } from "./providers";
import type { MinutaGenerator } from "./types";

const GENERATOR_FACTORIES: Record<LlmProvider, () => MinutaGenerator> = {
  openrouter: () => createOpenRouterGenerator(getOpenRouterClient(), getOpenRouterModels()),
  gemini: () => createGeminiGenerator(getGeminiClient()),
  anthropic: () => createAnthropicGenerator(getAnthropicClient()),
};

/** Recorded when a call fails before the provider says which model answered. */
const CONFIGURED_MODELS: Record<LlmProvider, () => string> = {
  openrouter: () => getOpenRouterModels()[0],
  gemini: () => GEMINI_MODEL,
  anthropic: () => ANTHROPIC_MODEL,
};

/**
 * Returns the generator for the provider chosen by the LLM_PROVIDER env var, audited under `operation`.
 * A missing API key is thrown lazily, on the first call, so the failure is recorded too.
 */
export function getMinutaGenerator(operation: LlmOperation): MinutaGenerator {
  const provider = resolveLlmProvider(process.env[LLM_PROVIDER_ENV_VAR]);
  const usage = getUsageRepository();

  return withUsageAudit((prompt) => GENERATOR_FACTORIES[provider]()(prompt), {
    operation,
    provider,
    configuredModel: CONFIGURED_MODELS[provider](),
    record: (call) => usage.record(call),
  });
}
