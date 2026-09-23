import { TASK_QUERY_PARAM } from "./paths";

/** A page's `?tarefa=` value (or another task parameter), from the searchParams the page receives. */
export function readTaskParam(
  searchParams: Record<string, string | string[] | undefined>,
  param: string = TASK_QUERY_PARAM,
): string | null {
  const value = searchParams[param];
  return typeof value === "string" && value.length > 0 ? value : null;
}
