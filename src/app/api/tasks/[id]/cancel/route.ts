import { HTTP_CONFLICT, HTTP_NOT_FOUND, errorResponse, type TaskResponseBody } from "@/lib/http/api";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { ensureTaskWorkerStarted } from "@/lib/tasks/getTaskWorker";
import { TASK_NOT_CANCELABLE_MESSAGE, TASK_NOT_FOUND_MESSAGE } from "@/lib/tasks/messages";

/** Cancels a queued or running task; a running one is aborted and its result discarded. */
export async function POST(_request: Request, ctx: RouteContext<"/api/tasks/[id]/cancel">): Promise<Response> {
  const { id } = await ctx.params;
  const tasks = getTaskRepository();
  if (!tasks.get(id)) return errorResponse(HTTP_NOT_FOUND, TASK_NOT_FOUND_MESSAGE);
  if (!ensureTaskWorkerStarted().cancel(id)) return errorResponse(HTTP_CONFLICT, TASK_NOT_CANCELABLE_MESSAGE);
  return Response.json({ task: tasks.get(id)! } satisfies TaskResponseBody);
}
