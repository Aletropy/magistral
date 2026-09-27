import { NEW_MINUTA_PATH } from "@/lib/minutas/paths";
import { TASK_QUERY_PARAM } from "@/lib/tasks/paths";

/** The query parameter that opens the minuta wizard with a finished suggestion applied. */
export const DRAFT_SUGGESTION_QUERY_PARAM = "rascunho";

export function draftSuggestionPath(taskId: string): string {
  return `${NEW_MINUTA_PATH}?${DRAFT_SUGGESTION_QUERY_PARAM}=${encodeURIComponent(taskId)}`;
}

/** The minuta page following a draft task, e.g. to retry one that failed. */
export function draftTaskPath(taskId: string): string {
  return `${NEW_MINUTA_PATH}?${TASK_QUERY_PARAM}=${encodeURIComponent(taskId)}`;
}
