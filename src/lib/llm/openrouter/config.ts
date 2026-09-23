export const OPENROUTER_API_KEY_ENV_VAR = "OPENROUTER_API_KEY";
export const OPENROUTER_MODELS_ENV_VAR = "OPENROUTER_MODELS";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Free models (":free", no cost) that support structured outputs, tried in order: when one is rate
 * limited or down, OpenRouter falls back to the next. Free models come and go, so OPENROUTER_MODELS can
 * replace this list without a code change. Checked against openrouter.ai/api/v1/models on 2026-09-23.
 */
export const DEFAULT_OPENROUTER_MODELS = [
  "qwen/qwen3.8-27b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nex-agi/nex-n2.5-pro:free",
] as const;

/** Room for a long contract plus the reasoning some free models do before answering. */
export const OPENROUTER_MAX_TOKENS = 32768;

/** Just under the minuta route's maxDuration, so a stuck upstream fails cleanly instead of hanging. */
export const OPENROUTER_TIMEOUT_MS = 280_000;

/** Identifies the app in OpenRouter's dashboard. */
export const OPENROUTER_APP_TITLE = "Magistral";
export const OPENROUTER_APP_URL = "http://localhost";

/** Parses the comma-separated OPENROUTER_MODELS value, falling back to the defaults when it is empty. */
export function resolveOpenRouterModels(value: string | undefined): string[] {
  const models = [...new Set((value ?? "").split(",").map((model) => model.trim()).filter(Boolean))];
  return models.length > 0 ? models : [...DEFAULT_OPENROUTER_MODELS];
}
