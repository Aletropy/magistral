import { getChatRepository } from "@/lib/chat/getChatRepository";
import { CONVERSATION_NOT_FOUND_MESSAGE } from "@/lib/chat/messages";
import { chatMessageInputSchema } from "@/lib/chat/schema";
import { startReply } from "@/lib/chat/startReply";
import { HTTP_ACCEPTED, HTTP_NOT_FOUND, errorResponse, type TaskCreatedResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";

/** Adds a question to the conversation and queues the answer. */
export const POST = defineRoute(
  { body: chatMessageInputSchema },
  async ({ user, body }, ctx: RouteContext<"/api/chat/conversations/[id]/messages">) => {
    const { id } = await ctx.params;
    const chats = getChatRepository();
    const conversation = chats.get(id, user.id);
    if (!conversation) return errorResponse(HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND_MESSAGE);
    const { replyId } = chats.addExchange(id, body.message);
    const taskId = startReply(chats, { ownerId: user.id, conversationId: id, replyId, title: conversation.title });
    return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
  },
);
