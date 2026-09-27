import { LlmConfigurationError } from "./errors";

export const LLM_PROVIDERS = ["openrouter", "gemini", "anthropic"] as const;

export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export const LLM_PROVIDER_ENV_VAR = "LLM_PROVIDER";
/**
 * How much library text (in characters, about 4 per token) a minuta prompt may carry whole before
 * hybrid search picks excerpts instead. Sized to each provider's context window and speed: free
 * OpenRouter models are slow on long prompts, Gemini Flash has a 1M-token window, and Claude bills
 * every token of it.
 */
export const LIBRARY_CONTEXT_BUDGET_CHARS: Record<LlmProvider, number> = {
  openrouter: 120_000,
  gemini: 400_000,
  anthropic: 200_000,
};

/** Free OpenRouter models: the Gemini free tier ran out of daily quota too often. */
export const DEFAULT_LLM_PROVIDER: LlmProvider = "openrouter";

function isLlmProvider(value: string): value is LlmProvider {
  return (LLM_PROVIDERS as readonly string[]).includes(value);
}

/** Resolves the LLM_PROVIDER env value; unset means the default, anything unknown is a config error. */
export function resolveLlmProvider(value: string | undefined): LlmProvider {
  const provider = value?.trim().toLowerCase();
  if (!provider) return DEFAULT_LLM_PROVIDER;
  if (isLlmProvider(provider)) return provider;
  throw new LlmConfigurationError(
    `${LLM_PROVIDER_ENV_VAR}="${value}" is not one of: ${LLM_PROVIDERS.join(", ")}.`,
  );
}
