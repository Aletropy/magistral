import { getBatchRepository } from "@/lib/batch/getBatchRepository";
import { ensureBatchWorkerStarted } from "@/lib/batch/getBatchWorker";
import { BATCH_NOT_FOUND_MESSAGE } from "@/lib/batch/messages";
import { publishActivity } from "@/lib/events/activityEvents";
import type { BatchRetryResponseBody } from "@/lib/http/contracts";
import { errorResponse } from "@/lib/http/responses";
import { defineRoute } from "@/lib/http/route";
import { HTTP_NOT_FOUND } from "@/lib/http/status";

/** Requeues the job's failed items, e.g. after the provider's rate limit or quota has reset. */
export const POST = defineRoute({}, async ({ user }, ctx: RouteContext<"/api/batch/[id]/retry">) => {
  const batches = getBatchRepository();
  const { id } = await ctx.params;
  if (!batches.getJob(id, user.id)) return errorResponse(HTTP_NOT_FOUND, BATCH_NOT_FOUND_MESSAGE);
  const requeued = batches.retryFailedItems(id, new Date());
  ensureBatchWorkerStarted().wake();
  publishActivity(user.id);
  return Response.json({ requeued } satisfies BatchRetryResponseBody);
});
