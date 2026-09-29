/** The dashboard. */
export const HOME_PATH = "/";
/** Where a minuta is drafted, step by step or with every field at once. */
export const NEW_MINUTA_PATH = "/minutas/nova";
/** Every field on one page, for people who already know what to ask. */
export const NEW_MINUTA_ADVANCED_PATH = "/minutas/nova/completo";
export const HISTORY_PATH = "/historico";

export function minutaPath(id: string): string {
  return `${HISTORY_PATH}/${encodeURIComponent(id)}`;
}
