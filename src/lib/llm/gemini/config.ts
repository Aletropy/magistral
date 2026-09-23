/**
 * Pinned stable Flash model that AI Studio keys (including the free tier) can call. The
 * "gemini-flash-latest" alias tracks the newest Flash, which is often overloaded (HTTP 503).
 */
export const GEMINI_MODEL = "gemini-2.5-flash";

/** Flash's output ceiling; thinking tokens count against it, so leave the full budget. */
export const GEMINI_MAX_OUTPUT_TOKENS = 65536;

export const GEMINI_API_KEY_ENV_VAR = "GEMINI_API_KEY";
