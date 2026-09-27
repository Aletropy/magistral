import type { User } from "@/lib/auth/types";
import type { BatchJobDetail } from "@/lib/batch/types";
import type { ChatConversation, ChatConversationSummary } from "@/lib/chat/types";
import type { Clause } from "@/lib/clauses/types";
import type { DraftResult, RewriteResult } from "@/lib/minuta/types";
import type { AppNotification } from "@/lib/notifications/types";
import type { Persona } from "@/lib/personas/types";
import type { StyleCaptureResult } from "@/lib/style/styleCaptureResult";
import type { TaskDetail, TaskSummary } from "@/lib/tasks/types";

export type RewriteResponseBody = RewriteResult;

export interface DemoLoadedResponseBody {
  added: number;
}

export interface ConversationsResponseBody {
  conversations: ChatConversationSummary[];
}

export interface ConversationResponseBody {
  conversation: ChatConversation;
}

export interface ConversationCreatedResponseBody {
  conversationId: string;
  taskId: string;
}

export interface UserResponseBody {
  user: User;
}

/** Every slow action answers 202 with the id of the background task doing the work. */
export interface TaskCreatedResponseBody {
  taskId: string;
}

export interface TaskResponseBody {
  task: TaskDetail;
}

export interface TasksResponseBody {
  tasks: TaskSummary[];
}

export interface NotificationsResponseBody {
  notifications: AppNotification[];
  unreadCount: number;
}

export interface ActivityResponseBody {
  activeTasks: TaskSummary[];
  /** Batch jobs with items still pending or running. */
  activeBatches: number;
  unreadCount: number;
  /** Notifications after the `since` cursor, oldest first; empty on the first poll. */
  notifications: AppNotification[];
  /** The cursor for the next poll. */
  latestId: number;
}

export interface ApiErrorBody {
  error: string;
}

export interface BatchCreatedResponseBody {
  id: string;
}

export interface BatchRetryResponseBody {
  requeued: number;
}

export interface BatchResponseBody {
  job: BatchJobDetail;
}

export interface ExtractTextResponseBody {
  text: string;
}

export type PlaygroundResponseBody = RewriteResponseBody;

export interface MinutaResponseBody extends DraftResult {
  /** The minuta's id in the history. */
  id: string;
}

export interface StyleCaptureResponseBody {
  result: StyleCaptureResult;
}

export interface ClauseResponseBody {
  clause: Clause;
}

export interface PersonaResponseBody {
  persona: Persona;
}
