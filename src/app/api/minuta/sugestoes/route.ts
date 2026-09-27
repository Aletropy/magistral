import { getChatRepository } from "@/lib/chat/getChatRepository";
import { CONVERSATION_NOT_FOUND_MESSAGE } from "@/lib/chat/messages";
import { HTTP_ACCEPTED, HTTP_NOT_FOUND, errorResponse, type TaskCreatedResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";
import { draftSuggestionPayloadSchema, suggestDraftTask } from "@/lib/minuta/suggestDraftTask";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";

/** Queues a reading of a base document, or of an Advogado IA conversation, that suggests how to fill the minuta form. */
export const POST = defineRoute({ body: draftSuggestionPayloadSchema }, ({ user, body: payload }) => {
  let title: string;
  if (payload.source === "document") {
    title = `Ler ${payload.document.name || "documento base"}`;
  } else {
    const conversation = getChatRepository().get(payload.conversationId, user.id);
    if (!conversation) return errorResponse(HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND_MESSAGE);
    title = `Minuta a partir de “${conversation.title}”`;
  }
  const taskId = enqueueTask(suggestDraftTask, { ownerId: user.id, title, payload });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
});
