import { LlmConfigurationError } from "./errors";

export const LLM_PROVIDERS = ["gemini", "anthropic"] as const;

export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export const LLM_PROVIDER_ENV_VAR = "LLM_PROVIDER";
export const DEFAULT_LLM_PROVIDER: LlmProvider = "gemini";

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
