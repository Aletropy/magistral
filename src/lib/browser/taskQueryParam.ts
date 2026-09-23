import { TASK_QUERY_PARAM } from "@/lib/tasks/paths";

/**
 * Keeps the task a page is following in its URL (`?tarefa=<id>`) without a navigation, so a refresh or
 * coming back from a notification restores it. Pass null to drop it.
 */
export function replaceTaskParam(taskId: string | null): void {
  const url = new URL(window.location.href);
  if (taskId) url.searchParams.set(TASK_QUERY_PARAM, taskId);
  else url.searchParams.delete(TASK_QUERY_PARAM);
  // A null state lets the Next.js router adopt the new URL (and keep it across router.refresh()).
  window.history.replaceState(null, "", url);
}
