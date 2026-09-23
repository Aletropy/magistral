/**
 * Pinned stable Flash model that AI Studio keys (including the free tier) can call. The
 * "gemini-flash-latest" alias tracks the newest Flash, which is often overloaded (HTTP 503).
 */
export const GEMINI_MODEL = "gemini-2.5-flash";

/** Flash's output ceiling; thinking tokens count against it, so leave the full budget. */
export const GEMINI_MAX_OUTPUT_TOKENS = 65536;

export const GEMINI_API_KEY_ENV_VAR = "GEMINI_API_KEY";

/**
 * Style Capture runs on Flash too: AI Studio free-tier keys get zero quota on the Pro models
 * (gemini-2.5-pro is also closed to new users). Flash's thinking handles a style analysis well.
 */
export const STYLE_EXTRACTION_MODEL = GEMINI_MODEL;

export const STYLE_EXTRACTION_MAX_OUTPUT_TOKENS = GEMINI_MAX_OUTPUT_TOKENS;

/** Low temperature keeps the analysis faithful to the document. */
export const STYLE_EXTRACTION_TEMPERATURE = 0.2;
