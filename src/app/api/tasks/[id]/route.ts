import type { TaskResponseBody } from "@/lib/http/contracts";
import { errorResponse } from "@/lib/http/responses";
import { defineRoute } from "@/lib/http/route";
import { HTTP_NOT_FOUND } from "@/lib/http/status";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { TASK_NOT_FOUND_MESSAGE } from "@/lib/tasks/messages";

export const GET = defineRoute({}, async ({ user }, ctx: RouteContext<"/api/tasks/[id]">) => {
  const task = getTaskRepository().get((await ctx.params).id, user.id);
  if (!task) return errorResponse(HTTP_NOT_FOUND, TASK_NOT_FOUND_MESSAGE);
  return Response.json({ task } satisfies TaskResponseBody);
});
