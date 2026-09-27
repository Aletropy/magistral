/** The session cookie; its value is a random token whose SHA-256 is the session's id in the database. */
export const SESSION_COOKIE_NAME = "magistral_session";
/** A session ends after this long without activity. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
/** Activity extends the session at most this often, so every request doesn't write to the database. */
export const SESSION_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
export const SESSION_TOKEN_BYTES = 32;
/** Stored with the session so the team page can show where it was opened. */
export const MAX_USER_AGENT_CHARS = 300;
