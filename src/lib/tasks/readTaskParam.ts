import { TASK_QUERY_PARAM } from "./paths";

/** A page's `?tarefa=` value, from the searchParams the page receives. */
export function readTaskParam(searchParams: Record<string, string | string[] | undefined>): string | null {
  const value = searchParams[TASK_QUERY_PARAM];
  return typeof value === "string" && value.length > 0 ? value : null;
}
