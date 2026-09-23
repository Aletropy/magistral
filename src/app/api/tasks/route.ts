import type { TasksResponseBody } from "@/lib/http/api";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";

/** How many tasks the task list shows. */
const TASK_LIST_LIMIT = 100;

/** Recent tasks, newest first; `?ativas=1` lists only pending and running ones. */
export async function GET(request: Request): Promise<Response> {
  const activeOnly = new URL(request.url).searchParams.get("ativas") === "1";
  const tasks = getTaskRepository().list({ activeOnly, limit: TASK_LIST_LIMIT });
  return Response.json({ tasks } satisfies TasksResponseBody);
}
