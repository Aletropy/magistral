import { HTTP_ACCEPTED, HTTP_BAD_REQUEST, errorResponse, parseJsonBody, type TaskCreatedResponseBody } from "@/lib/http/api";
import { UNEXPECTED_ERROR } from "@/lib/llm/errors";
import { loadDraftInputs } from "@/lib/minuta/draftMinuta";
import { draftMinutaTask, draftTaskTitle } from "@/lib/minuta/draftMinutaTask";
import { MinutaRequestError } from "@/lib/minuta/errors";
import { minutaRequestSchema } from "@/lib/minuta/schema";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";

/**
 * Queues the minuta for drafting and answers at once with the task id: free models take minutes, and the
 * user can keep working meanwhile. The request is checked first, so bad input still fails right away.
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, minutaRequestSchema);
  if ("response" in parsed) return parsed.response;

  try {
    loadDraftInputs(parsed.data);
  } catch (error) {
    if (error instanceof MinutaRequestError) return errorResponse(HTTP_BAD_REQUEST, error.message);
    console.error("[api/minuta] request check failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }

  const taskId = enqueueTask(draftMinutaTask, { title: draftTaskTitle(parsed.data), payload: parsed.data });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
}
