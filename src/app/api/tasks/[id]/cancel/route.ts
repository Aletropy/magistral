import { publishActivity } from "@/lib/events/activityEvents";
import type { TaskResponseBody } from "@/lib/http/contracts";
import { errorResponse } from "@/lib/http/responses";
import { defineRoute } from "@/lib/http/route";
import { HTTP_CONFLICT, HTTP_NOT_FOUND } from "@/lib/http/status";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { ensureTaskWorkerStarted } from "@/lib/tasks/getTaskWorker";
import { TASK_NOT_CANCELABLE_MESSAGE, TASK_NOT_FOUND_MESSAGE } from "@/lib/tasks/messages";

/** Cancels a queued or running task; a running one is aborted and its result discarded. */
export const POST = defineRoute({}, async ({ user }, ctx: RouteContext<"/api/tasks/[id]/cancel">) => {
  const { id } = await ctx.params;
  const tasks = getTaskRepository();
  if (!tasks.get(id, user.id)) return errorResponse(HTTP_NOT_FOUND, TASK_NOT_FOUND_MESSAGE);
  if (!ensureTaskWorkerStarted().cancel(id)) return errorResponse(HTTP_CONFLICT, TASK_NOT_CANCELABLE_MESSAGE);
  publishActivity(user.id);
  return Response.json({ task: tasks.get(id, user.id)! } satisfies TaskResponseBody);
});
