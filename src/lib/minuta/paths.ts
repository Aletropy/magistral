import { HOME_PATH } from "@/lib/minutas/paths";

/** The query parameter that opens the minuta wizard with a finished suggestion applied. */
export const DRAFT_SUGGESTION_QUERY_PARAM = "rascunho";

export function draftSuggestionPath(taskId: string): string {
  return `${HOME_PATH}?${DRAFT_SUGGESTION_QUERY_PARAM}=${encodeURIComponent(taskId)}`;
}
