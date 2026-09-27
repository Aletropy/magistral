import { HTTP_ACCEPTED, type TaskCreatedResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";
import { loadDraftInputs } from "@/lib/minuta/draftMinuta";
import { draftMinutaTask, draftTaskTitle } from "@/lib/minuta/draftMinutaTask";
import { minutaRequestSchema } from "@/lib/minuta/schema";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";

/**
 * Queues the minuta for drafting and answers at once with the task id: free models take minutes, and the
 * user can keep working meanwhile. The request is checked first, so bad input still fails right away.
 */
export const POST = defineRoute({ body: minutaRequestSchema }, ({ user, body }) => {
  loadDraftInputs(body);
  const taskId = enqueueTask(draftMinutaTask, { ownerId: user.id, title: draftTaskTitle(body), payload: body });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
});
