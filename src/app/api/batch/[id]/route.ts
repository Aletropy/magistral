import { getBatchRepository } from "@/lib/batch/getBatchRepository";
import { ensureBatchWorkerStarted } from "@/lib/batch/getBatchWorker";
import { BATCH_NOT_FOUND_MESSAGE } from "@/lib/batch/messages";
import type { BatchResponseBody } from "@/lib/http/contracts";
import { errorResponse } from "@/lib/http/responses";
import { defineRoute } from "@/lib/http/route";
import { HTTP_NOT_FOUND, HTTP_NO_CONTENT } from "@/lib/http/status";

type Context = RouteContext<"/api/batch/[id]">;

export const GET = defineRoute({}, async ({ user }, ctx: Context) => {
  const job = getBatchRepository().getJob((await ctx.params).id, user.id);
  if (!job) return errorResponse(HTTP_NOT_FOUND, BATCH_NOT_FOUND_MESSAGE);
  return Response.json({ job } satisfies BatchResponseBody);
});

/** Deletes the job and its items; items being drafted right now are aborted, so they stop spending quota. */
export const DELETE = defineRoute({}, async ({ user }, ctx: Context) => {
  const { id } = await ctx.params;
  if (!getBatchRepository().deleteJob(id, user.id)) return errorResponse(HTTP_NOT_FOUND, BATCH_NOT_FOUND_MESSAGE);
  ensureBatchWorkerStarted().cancelJob(id);
  return new Response(null, { status: HTTP_NO_CONTENT });
});
