import type { ConsultedSource } from "@/lib/minuta/types";
import type { ChatToolStep } from "./toolSteps";

export const CHAT_ROLES = ["user", "assistant"] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

/** A user message is always done; an assistant reply is pending while its background task runs. */
export const CHAT_MESSAGE_STATUSES = ["pending", "done", "failed"] as const;
export type ChatMessageStatus = (typeof CHAT_MESSAGE_STATUSES)[number];

export interface ChatMessage {
  id: number;
  role: ChatRole;
  content: string;
  status: ChatMessageStatus;
  error: string | null;
  /** Library excerpts the reply was given, in the order of its [F1], [F2]… citations. */
  sources: ConsultedSource[];
  /** The tools the reply used and the action it proposed, in order. */
  steps: ChatToolStep[];
  /** The background task writing a pending reply. */
  taskId: string | null;
  createdAt: string;
}

export interface ChatConversationSummary {
  id: string;
  title: string;
  /** The saved minuta the conversation is about, if any. */
  minutaId: string | null;
  /** Each question searches the legal library. */
  useLibrary: boolean;
  /** Each question may search jurisprudence for grounding, never shown as a source. */
  useJurisprudencia: boolean;
  createdAt: string;
  updatedAt: string;
  /** The start of the newest message, for the conversation list. */
  preview: string | null;
  isReplying: boolean;
}

export interface ChatConversation extends ChatConversationSummary {
  minutaTitle: string | null;
  messages: ChatMessage[];
}
