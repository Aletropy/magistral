import { HTTP_NOT_FOUND, errorResponse, type TaskResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { TASK_NOT_FOUND_MESSAGE } from "@/lib/tasks/messages";

export const GET = defineRoute({}, async ({ user }, ctx: RouteContext<"/api/tasks/[id]">) => {
  const task = getTaskRepository().get((await ctx.params).id, user.id);
  if (!task) return errorResponse(HTTP_NOT_FOUND, TASK_NOT_FOUND_MESSAGE);
  return Response.json({ task } satisfies TaskResponseBody);
});
