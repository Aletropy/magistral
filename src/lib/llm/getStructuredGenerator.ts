import "server-only";
import { getUsageRepository } from "@/lib/usage/getUsageRepository";
import type { LlmOperation } from "@/lib/usage/types";
import { withUsageAudit } from "@/lib/usage/withUsageAudit";
import { getGeminiClient } from "./gemini/client";
import { STRUCTURED_OUTPUT_MODEL } from "./gemini/config";
import { createGeminiJsonGenerator } from "./gemini/generateJson";
import { getOpenRouterClient, getOpenRouterModels } from "./openrouter/client";
import { createOpenRouterJsonGenerator } from "./openrouter/generateJson";
import { LLM_PROVIDER_ENV_VAR, resolveLlmProvider, type LlmProvider } from "./providers";
import type { StructuredGenerator } from "./types";

type StructuredProvider = Extract<LlmProvider, "openrouter" | "gemini">;

/**
 * Structured JSON answers run on OpenRouter when that is the drafting provider, and on Gemini otherwise
 * (Anthropic drafting keeps using Gemini for these steps).
 */
function structuredProvider(): StructuredProvider {
  return resolveLlmProvider(process.env[LLM_PROVIDER_ENV_VAR]) === "openrouter" ? "openrouter" : "gemini";
}

const FACTORIES: Record<StructuredProvider, () => StructuredGenerator> = {
  openrouter: () => createOpenRouterJsonGenerator(getOpenRouterClient(), getOpenRouterModels()),
  gemini: () => createGeminiJsonGenerator(getGeminiClient()),
};

const CONFIGURED_MODELS: Record<StructuredProvider, () => string> = {
  openrouter: () => getOpenRouterModels()[0],
  gemini: () => STRUCTURED_OUTPUT_MODEL,
};

/** The structured-output generator, audited under `operation`; a missing key is thrown on the first call. */
export function getStructuredGenerator(operation: LlmOperation): StructuredGenerator {
  const provider = structuredProvider();
  const usage = getUsageRepository();
  return withUsageAudit((prompt, schema, options) => FACTORIES[provider]()(prompt, schema, options), {
    operation,
    provider,
    configuredModel: CONFIGURED_MODELS[provider](),
    record: (call) => usage.record(call),
  });
}
