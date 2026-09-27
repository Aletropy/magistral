export const OPENROUTER_API_KEY_ENV_VAR = "OPENROUTER_API_KEY";
export const OPENROUTER_MODELS_ENV_VAR = "OPENROUTER_MODELS";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Models tried in order: when one is rate limited or down, OpenRouter falls back to the next. Requests
 * only go to zero-data-retention endpoints (see PRIVATE_ROUTING), so every model here must have one; this
 * free model is the only free one with a ZDR endpoint that also supports structured outputs, per
 * openrouter.ai/api/v1/endpoints/zdr on 2026-09-27. OPENROUTER_MODELS can add fallbacks from that list.
 */
export const DEFAULT_OPENROUTER_MODELS = ["qwen/qwen3.8-27b:free"] as const;

/** Set to "true" to also route to providers that may keep or train on prompts (e.g. most free models). */
export const OPENROUTER_ALLOW_DATA_COLLECTION_ENV_VAR = "OPENROUTER_ALLOW_DATA_COLLECTION";

/** OpenRouter's provider routing preferences that decide which endpoints may see the prompt. */
export interface ProviderRouting {
  /** "deny" skips providers that store prompts or use them for training. */
  data_collection: "allow" | "deny";
  /** Only endpoints with a zero-data-retention agreement. */
  zdr: boolean;
}

/** The default: client documents and party data only reach providers that keep nothing. */
export const PRIVATE_ROUTING: ProviderRouting = { data_collection: "deny", zdr: true };
export const OPEN_ROUTING: ProviderRouting = { data_collection: "allow", zdr: false };

export function resolveProviderRouting(allowDataCollection: string | undefined): ProviderRouting {
  return allowDataCollection?.trim().toLowerCase() === "true" ? OPEN_ROUTING : PRIVATE_ROUTING;
}

/** Room for a long contract plus the reasoning some free models do before answering. */
export const OPENROUTER_MAX_TOKENS = 32768;

/** Free models are slow; past this a stuck upstream fails cleanly (and is retried) instead of hanging. */
export const OPENROUTER_TIMEOUT_MS = 280_000;

/** Identifies the app in OpenRouter's dashboard. */
export const OPENROUTER_APP_TITLE = "Magistral";
export const OPENROUTER_APP_URL = "http://localhost";

/** Parses the comma-separated OPENROUTER_MODELS value, falling back to the defaults when it is empty. */
export function resolveOpenRouterModels(value: string | undefined): string[] {
  const models = [...new Set((value ?? "").split(",").map((model) => model.trim()).filter(Boolean))];
  return models.length > 0 ? models : [...DEFAULT_OPENROUTER_MODELS];
}
