import { ChatBusyError } from "@/lib/chat/errors";
import { getChatRepository } from "@/lib/chat/getChatRepository";
import { CONVERSATION_NOT_FOUND_MESSAGE, REPLY_NOT_RETRYABLE_MESSAGE } from "@/lib/chat/messages";
import { startReply } from "@/lib/chat/startReply";
import {
  HTTP_ACCEPTED,
  HTTP_CONFLICT,
  HTTP_NOT_FOUND,
  errorResponse,
  type TaskCreatedResponseBody,
} from "@/lib/http/api";

type Context = RouteContext<"/api/chat/conversations/[id]/messages/[messageId]/retry">;

/** Writes a failed reply again. */
export async function POST(_request: Request, ctx: Context): Promise<Response> {
  const { id, messageId } = await ctx.params;
  const chats = getChatRepository();
  const conversation = chats.get(id);
  if (!conversation) return errorResponse(HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND_MESSAGE);

  try {
    const replyId = Number(messageId);
    if (!Number.isInteger(replyId) || !chats.retryReply(id, replyId)) {
      return errorResponse(HTTP_CONFLICT, REPLY_NOT_RETRYABLE_MESSAGE);
    }
    const taskId = startReply(chats, id, replyId, conversation.title);
    return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
  } catch (error) {
    if (error instanceof ChatBusyError) return errorResponse(HTTP_CONFLICT, error.message);
    throw error;
  }
}
