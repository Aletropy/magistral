import { publishActivity } from "@/lib/events/activityEvents";
import type { TaskResponseBody } from "@/lib/http/contracts";
import { errorResponse } from "@/lib/http/responses";
import { defineRoute } from "@/lib/http/route";
import { HTTP_CONFLICT, HTTP_NOT_FOUND } from "@/lib/http/status";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { ensureTaskWorkerStarted } from "@/lib/tasks/getTaskWorker";
import { TASK_FILES_GONE_MESSAGE, TASK_NOT_FOUND_MESSAGE, TASK_NOT_RETRYABLE_MESSAGE } from "@/lib/tasks/messages";
import { taskNeedsFiles } from "@/lib/tasks/types";

/** Queues a failed or cancelled task again with fresh attempts. */
export const POST = defineRoute({}, async ({ user }, ctx: RouteContext<"/api/tasks/[id]/retry">) => {
  const { id } = await ctx.params;
  const tasks = getTaskRepository();
  const task = tasks.get(id, user.id);
  if (!task) return errorResponse(HTTP_NOT_FOUND, TASK_NOT_FOUND_MESSAGE);
  if (taskNeedsFiles(task.kind) && tasks.files(id).length === 0) {
    return errorResponse(HTTP_CONFLICT, TASK_FILES_GONE_MESSAGE);
  }
  if (!tasks.requeue(id, new Date())) return errorResponse(HTTP_CONFLICT, TASK_NOT_RETRYABLE_MESSAGE);
  ensureTaskWorkerStarted().wake();
  publishActivity(user.id);
  return Response.json({ task: tasks.get(id, user.id)! } satisfies TaskResponseBody);
});
