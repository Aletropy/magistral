/**
 * The walk-away unlock marker's cookie name. `proxy.ts` imports this file, so it must stay
 * free of `server-only` imports and Node-only APIs (the proxy also runs on the edge).
 */
export const UNLOCK_COOKIE_NAME = "magistral_unlock";

export const UNLOCK_COOKIE_NAMES: readonly string[] = [UNLOCK_COOKIE_NAME];
