import "server-only";
import type { PageContext } from "@/lib/assistant/pageContext";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";
import { chatReplyTask } from "./chatReplyTask";
import type { ChatRepository } from "./repository";

export interface ReplyRequest {
  ownerId: string;
  conversationId: string;
  replyId: number;
  title: string;
  /** The page the question was asked on, when it came from the panel. */
  context?: PageContext | null;
}

/**
 * Queues the task that writes a pending reply and links it to the message; returns the task id. When the
 * task can't be queued (e.g. the user's queue is full) the reply is marked failed, so it can be retried.
 */
export function startReply(
  chats: ChatRepository,
  { ownerId, conversationId, replyId, title, context = null }: ReplyRequest,
): string {
  try {
    const taskId = enqueueTask(chatReplyTask, {
      ownerId,
      title: `Advogado IA: ${title}`,
      payload: { conversationId, replyId, context },
    });
    chats.attachTask(replyId, taskId);
    return taskId;
  } catch (error) {
    chats.failReply(replyId, error instanceof Error ? error.message : String(error));
    throw error;
  }
}
