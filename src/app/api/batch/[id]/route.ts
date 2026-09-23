import { getBatchRepository } from "@/lib/batch/getBatchRepository";
import { BATCH_NOT_FOUND_MESSAGE } from "@/lib/batch/messages";
import { HTTP_NOT_FOUND, HTTP_NO_CONTENT, errorResponse, type BatchResponseBody } from "@/lib/http/api";

export async function GET(_request: Request, ctx: RouteContext<"/api/batch/[id]">): Promise<Response> {
  const job = getBatchRepository().getJob((await ctx.params).id);
  if (!job) return errorResponse(HTTP_NOT_FOUND, BATCH_NOT_FOUND_MESSAGE);
  return Response.json({ job } satisfies BatchResponseBody);
}

/** Deletes the job and its items; an item being drafted right now finishes but its result is dropped. */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/batch/[id]">): Promise<Response> {
  if (!getBatchRepository().deleteJob((await ctx.params).id)) {
    return errorResponse(HTTP_NOT_FOUND, BATCH_NOT_FOUND_MESSAGE);
  }
  return new Response(null, { status: HTTP_NO_CONTENT });
}
