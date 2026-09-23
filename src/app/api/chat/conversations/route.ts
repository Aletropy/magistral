import { getChatRepository } from "@/lib/chat/getChatRepository";
import { newConversationSchema, titleFromMessage } from "@/lib/chat/schema";
import { startReply } from "@/lib/chat/startReply";
import {
  HTTP_CREATED,
  HTTP_NOT_FOUND,
  errorResponse,
  parseJsonBody,
  type ConversationCreatedResponseBody,
  type ConversationsResponseBody,
} from "@/lib/http/api";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { MINUTA_NOT_FOUND_MESSAGE } from "@/lib/minutas/messages";

export async function GET(): Promise<Response> {
  return Response.json({ conversations: getChatRepository().list() } satisfies ConversationsResponseBody);
}

/** Starts a conversation with its first question (optionally about a saved minuta) and queues the answer. */
export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, newConversationSchema);
  if ("response" in parsed) return parsed.response;
  const { message, minutaId, useLibrary } = parsed.data;
  const minuta = minutaId ? getMinutaRepository().get(minutaId) : null;
  if (minutaId && !minuta) return errorResponse(HTTP_NOT_FOUND, MINUTA_NOT_FOUND_MESSAGE);

  const chats = getChatRepository();
  const title = minuta ? `Sobre: ${minuta.title}` : titleFromMessage(message);
  const conversationId = chats.createConversation({ title: titleFromMessage(title), minutaId, useLibrary });
  const { replyId } = chats.addExchange(conversationId, message);
  const taskId = startReply(chats, conversationId, replyId, title);
  return Response.json({ conversationId, taskId } satisfies ConversationCreatedResponseBody, { status: HTTP_CREATED });
}
