import { HTTP_ACCEPTED, parseJsonBody, type TaskCreatedResponseBody } from "@/lib/http/api";
import { draftSuggestionPayloadSchema, suggestDraftTask } from "@/lib/minuta/suggestDraftTask";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";

/** Queues a reading of a base document that suggests how to fill the minuta form. */
export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, draftSuggestionPayloadSchema);
  if ("response" in parsed) return parsed.response;
  const taskId = enqueueTask(suggestDraftTask, {
    title: `Ler ${parsed.data.document.name || "documento base"}`,
    payload: parsed.data,
  });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
}
