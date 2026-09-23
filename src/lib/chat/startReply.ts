import "server-only";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";
import { chatReplyTask } from "./chatReplyTask";
import type { ChatRepository } from "./repository";

/** Queues the task that writes a pending reply and links it to the message; returns the task id. */
export function startReply(chats: ChatRepository, conversationId: string, replyId: number, title: string): string {
  const taskId = enqueueTask(chatReplyTask, { title: `Advogado IA: ${title}`, payload: { conversationId, replyId } });
  chats.attachTask(replyId, taskId);
  return taskId;
}
