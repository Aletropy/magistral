export const HOME_PATH = "/";
export const HISTORY_PATH = "/historico";

export function minutaPath(id: string): string {
  return `${HISTORY_PATH}/${encodeURIComponent(id)}`;
}
