import { getChatRepository } from "@/lib/chat/getChatRepository";
import { CONVERSATION_NOT_FOUND_MESSAGE } from "@/lib/chat/messages";
import { conversationUpdateSchema } from "@/lib/chat/schema";
import {
  HTTP_NOT_FOUND,
  HTTP_NO_CONTENT,
  errorResponse,
  parseJsonBody,
  type ConversationResponseBody,
} from "@/lib/http/api";
import { ensureTaskWorkerStarted } from "@/lib/tasks/getTaskWorker";

type Context = RouteContext<"/api/chat/conversations/[id]">;

export async function GET(_request: Request, ctx: Context): Promise<Response> {
  const conversation = getChatRepository().get((await ctx.params).id);
  if (!conversation) return errorResponse(HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND_MESSAGE);
  return Response.json({ conversation } satisfies ConversationResponseBody);
}

/** Renames the conversation or turns the library search on or off. */
export async function PATCH(request: Request, ctx: Context): Promise<Response> {
  const parsed = await parseJsonBody(request, conversationUpdateSchema);
  if ("response" in parsed) return parsed.response;
  const { id } = await ctx.params;
  const chats = getChatRepository();
  if (!chats.get(id)) return errorResponse(HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND_MESSAGE);
  if (parsed.data.title !== undefined) chats.rename(id, parsed.data.title);
  if (parsed.data.useLibrary !== undefined) chats.setUseLibrary(id, parsed.data.useLibrary);
  return Response.json({ conversation: chats.get(id)! } satisfies ConversationResponseBody);
}

/** Deletes the conversation; a reply still being written is cancelled first. */
export async function DELETE(_request: Request, ctx: Context): Promise<Response> {
  const { id } = await ctx.params;
  const chats = getChatRepository();
  const conversation = chats.get(id);
  if (!conversation) return errorResponse(HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND_MESSAGE);
  const worker = ensureTaskWorkerStarted();
  for (const message of conversation.messages) {
    if (message.status === "pending" && message.taskId) worker.cancel(message.taskId);
  }
  chats.delete(id);
  return new Response(null, { status: HTTP_NO_CONTENT });
}
