import { getChatRepository } from "@/lib/chat/getChatRepository";
import { CONVERSATION_NOT_FOUND_MESSAGE } from "@/lib/chat/messages";
import { conversationUpdateSchema } from "@/lib/chat/schema";
import { HTTP_NOT_FOUND, HTTP_NO_CONTENT, errorResponse, type ConversationResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";
import { ensureTaskWorkerStarted } from "@/lib/tasks/getTaskWorker";

type Context = RouteContext<"/api/chat/conversations/[id]">;

export const GET = defineRoute({}, async ({ user }, ctx: Context) => {
  const conversation = getChatRepository().get((await ctx.params).id, user.id);
  if (!conversation) return errorResponse(HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND_MESSAGE);
  return Response.json({ conversation } satisfies ConversationResponseBody);
});

/** Renames the conversation or turns the library search on or off. */
export const PATCH = defineRoute({ body: conversationUpdateSchema }, async ({ user, body }, ctx: Context) => {
  const { id } = await ctx.params;
  const chats = getChatRepository();
  if (!chats.get(id, user.id)) return errorResponse(HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND_MESSAGE);
  if (body.title !== undefined) chats.rename(id, user.id, body.title);
  if (body.useLibrary !== undefined) chats.setUseLibrary(id, user.id, body.useLibrary);
  return Response.json({ conversation: chats.get(id, user.id)! } satisfies ConversationResponseBody);
});

/** Deletes the conversation; a reply still being written is cancelled first. */
export const DELETE = defineRoute({}, async ({ user }, ctx: Context) => {
  const { id } = await ctx.params;
  const chats = getChatRepository();
  const conversation = chats.get(id, user.id);
  if (!conversation) return errorResponse(HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND_MESSAGE);
  const worker = ensureTaskWorkerStarted();
  for (const message of conversation.messages) {
    if (message.status === "pending" && message.taskId) worker.cancel(message.taskId);
  }
  chats.delete(id, user.id);
  return new Response(null, { status: HTTP_NO_CONTENT });
});
