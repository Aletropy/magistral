/**
 * The browsers' unlock markers for the PIN-gated sections. Edge-safe: proxy.ts reads these too, so
 * this module must stay free of server-only imports.
 */
export const SYSTEM_UNLOCK_COOKIE_NAME = "magistral_system_unlock";
export const DEV_UNLOCK_COOKIE_NAME = "magistral_dev_unlock";
export const UNLOCK_COOKIE_NAMES: readonly string[] = [SYSTEM_UNLOCK_COOKIE_NAME, DEV_UNLOCK_COOKIE_NAME];

/** The PIN-gated sections: the Sistema menu and Desenvolvimento inside it. */
export type PinScope = "sistema" | "desenvolvimento";
