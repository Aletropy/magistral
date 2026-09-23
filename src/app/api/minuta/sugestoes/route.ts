import { getChatRepository } from "@/lib/chat/getChatRepository";
import { CONVERSATION_NOT_FOUND_MESSAGE } from "@/lib/chat/messages";
import {
  HTTP_ACCEPTED,
  HTTP_NOT_FOUND,
  errorResponse,
  parseJsonBody,
  type TaskCreatedResponseBody,
} from "@/lib/http/api";
import { draftSuggestionPayloadSchema, suggestDraftTask } from "@/lib/minuta/suggestDraftTask";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";

/** Queues a reading of a base document, or of an Advogado IA conversation, that suggests how to fill the minuta form. */
export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, draftSuggestionPayloadSchema);
  if ("response" in parsed) return parsed.response;
  const payload = parsed.data;

  let title: string;
  if (payload.source === "document") {
    title = `Ler ${payload.document.name || "documento base"}`;
  } else {
    const conversation = getChatRepository().get(payload.conversationId);
    if (!conversation) return errorResponse(HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND_MESSAGE);
    title = `Minuta a partir de “${conversation.title}”`;
  }
  const taskId = enqueueTask(suggestDraftTask, { title, payload });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
}
