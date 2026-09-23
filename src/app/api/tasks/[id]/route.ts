import { HTTP_NOT_FOUND, errorResponse, type TaskResponseBody } from "@/lib/http/api";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { TASK_NOT_FOUND_MESSAGE } from "@/lib/tasks/messages";

export async function GET(_request: Request, ctx: RouteContext<"/api/tasks/[id]">): Promise<Response> {
  const task = getTaskRepository().get((await ctx.params).id);
  if (!task) return errorResponse(HTTP_NOT_FOUND, TASK_NOT_FOUND_MESSAGE);
  return Response.json({ task } satisfies TaskResponseBody);
}
