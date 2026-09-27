import { getBatchRepository } from "@/lib/batch/getBatchRepository";
import { BATCH_NOT_FOUND_MESSAGE } from "@/lib/batch/messages";
import { HTTP_NOT_FOUND, HTTP_NO_CONTENT, errorResponse, type BatchResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";

type Context = RouteContext<"/api/batch/[id]">;

export const GET = defineRoute({}, async ({ user }, ctx: Context) => {
  const job = getBatchRepository().getJob((await ctx.params).id, user.id);
  if (!job) return errorResponse(HTTP_NOT_FOUND, BATCH_NOT_FOUND_MESSAGE);
  return Response.json({ job } satisfies BatchResponseBody);
});

/** Deletes the job and its items; an item being drafted right now finishes but its result is dropped. */
export const DELETE = defineRoute({}, async ({ user }, ctx: Context) => {
  if (!getBatchRepository().deleteJob((await ctx.params).id, user.id)) {
    return errorResponse(HTTP_NOT_FOUND, BATCH_NOT_FOUND_MESSAGE);
  }
  return new Response(null, { status: HTTP_NO_CONTENT });
});
