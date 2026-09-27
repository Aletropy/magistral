import type { TasksResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";

/** How many tasks the task list shows. */
const TASK_LIST_LIMIT = 100;

/** The user's recent tasks, newest first; `?ativas=1` lists only pending and running ones. */
export const GET = defineRoute({}, ({ request, user }) => {
  const activeOnly = new URL(request.url).searchParams.get("ativas") === "1";
  const tasks = getTaskRepository().list({ ownerId: user.id, activeOnly, limit: TASK_LIST_LIMIT });
  return Response.json({ tasks } satisfies TasksResponseBody);
});
