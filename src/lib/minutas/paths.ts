/** The dashboard. */
export const HOME_PATH = "/";
/** Where a minuta is drafted, step by step or with every field at once. */
export const NEW_MINUTA_PATH = "/minutas/nova";
export const HISTORY_PATH = "/historico";

export function minutaPath(id: string): string {
  return `${HISTORY_PATH}/${encodeURIComponent(id)}`;
}
