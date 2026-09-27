import { getChatRepository } from "@/lib/chat/getChatRepository";
import { newConversationSchema, titleFromMessage } from "@/lib/chat/schema";
import { startReply } from "@/lib/chat/startReply";
import type { ConversationCreatedResponseBody, ConversationsResponseBody } from "@/lib/http/contracts";
import { errorResponse } from "@/lib/http/responses";
import { defineRoute } from "@/lib/http/route";
import { HTTP_CREATED, HTTP_NOT_FOUND } from "@/lib/http/status";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { MINUTA_NOT_FOUND_MESSAGE } from "@/lib/minutas/messages";

export const GET = defineRoute({}, ({ user }) =>
  Response.json({ conversations: getChatRepository().list(user.id) } satisfies ConversationsResponseBody),
);

/** Starts a conversation with its first question (optionally about a saved minuta) and queues the answer. */
export const POST = defineRoute({ body: newConversationSchema }, ({ user, body }) => {
  const { message, minutaId, useLibrary } = body;
  const minuta = minutaId ? getMinutaRepository().get(minutaId, user.id) : null;
  if (minutaId && !minuta) return errorResponse(HTTP_NOT_FOUND, MINUTA_NOT_FOUND_MESSAGE);

  const chats = getChatRepository();
  const title = titleFromMessage(minuta ? `Sobre: ${minuta.title}` : message);
  const conversationId = chats.createConversation({ ownerId: user.id, title, minutaId, useLibrary });
  const { replyId } = chats.addExchange(conversationId, message);
  const taskId = startReply(chats, { ownerId: user.id, conversationId, replyId, title });
  return Response.json({ conversationId, taskId } satisfies ConversationCreatedResponseBody, { status: HTTP_CREATED });
});
