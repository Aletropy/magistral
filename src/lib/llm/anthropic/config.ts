export const ANTHROPIC_MODEL = "claude-opus-5";

/** Generous ceiling so long contracts are never cut off; streaming keeps it clear of HTTP timeouts. */
export const ANTHROPIC_MAX_TOKENS = 64000;

/** Server-side refusal fallback: the API reruns a declined request on Anthropic's recommended model. */
export const REFUSAL_FALLBACK_BETA = "server-side-fallback-2026-07-01";
export const REFUSAL_FALLBACK_MODE = "default";

export const ANTHROPIC_API_KEY_ENV_VAR = "ANTHROPIC_API_KEY";
