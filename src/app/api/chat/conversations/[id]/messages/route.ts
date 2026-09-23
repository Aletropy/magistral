import { ChatBusyError } from "@/lib/chat/errors";
import { getChatRepository } from "@/lib/chat/getChatRepository";
import { CONVERSATION_NOT_FOUND_MESSAGE } from "@/lib/chat/messages";
import { chatMessageInputSchema } from "@/lib/chat/schema";
import { startReply } from "@/lib/chat/startReply";
import {
  HTTP_ACCEPTED,
  HTTP_CONFLICT,
  HTTP_NOT_FOUND,
  errorResponse,
  parseJsonBody,
  type TaskCreatedResponseBody,
} from "@/lib/http/api";

/** Adds a question to the conversation and queues the answer. */
export async function POST(request: Request, ctx: RouteContext<"/api/chat/conversations/[id]/messages">): Promise<Response> {
  const parsed = await parseJsonBody(request, chatMessageInputSchema);
  if ("response" in parsed) return parsed.response;
  const { id } = await ctx.params;
  const chats = getChatRepository();
  const conversation = chats.get(id);
  if (!conversation) return errorResponse(HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND_MESSAGE);

  try {
    const { replyId } = chats.addExchange(id, parsed.data.message);
    const taskId = startReply(chats, id, replyId, conversation.title);
    return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
  } catch (error) {
    if (error instanceof ChatBusyError) return errorResponse(HTTP_CONFLICT, error.message);
    throw error;
  }
}
