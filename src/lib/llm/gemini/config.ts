/**
 * Pinned stable Flash model that AI Studio keys (including the free tier) can call. The
 * "gemini-flash-latest" alias tracks the newest Flash, which is often overloaded (HTTP 503).
 */
export const GEMINI_MODEL = "gemini-2.5-flash";

/** Flash's output ceiling; thinking tokens count against it, so leave the full budget. */
export const GEMINI_MAX_OUTPUT_TOKENS = 65536;

export const GEMINI_API_KEY_ENV_VAR = "GEMINI_API_KEY";

/**
 * Structured answers (style capture, draft suggestions) run on Flash too: AI Studio free-tier keys get
 * zero quota on the Pro models (gemini-2.5-pro is also closed to new users). Flash's thinking handles
 * a style analysis or a document reading well.
 */
export const STRUCTURED_OUTPUT_MODEL = GEMINI_MODEL;

export const STRUCTURED_OUTPUT_MAX_TOKENS = GEMINI_MAX_OUTPUT_TOKENS;

/** Newest Gemini embedding model; it returns unit-length vectors at any dimensionality. */
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-2";

/** Reduced from the native 3072 to keep the local index small; retrieval quality barely changes. */
export const EMBEDDING_DIMENSIONS = 768;
