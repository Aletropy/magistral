import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { withTransaction } from "@/lib/db/transaction";
import type { ConsultedSource } from "@/lib/minuta/types";
import { ChatBusyError } from "./errors";
import { STEP_DISMISSED_OUTPUT } from "./messages";
import {
  TOOL_KINDS,
  TOOL_STEP_STATUSES,
  toolCardSchema,
  type ChatToolStep,
  type NewToolStep,
  type StoredToolStep,
  type ToolCard,
  type ToolStepStatus,
} from "./toolSteps";
import {
  CHAT_MESSAGE_STATUSES,
  CHAT_ROLES,
  type ChatConversation,
  type ChatConversationSummary,
  type ChatMessage,
} from "./types";

/** How much of the newest message the conversation list shows. */
const PREVIEW_CHARS = 140;

const consultedSourceSchema = z.object({ ref: z.string(), title: z.string(), label: z.string() });
const sourcesJson = z
  .string()
  .nullable()
  .transform((json) => (json ? (JSON.parse(json) as unknown) : []))
  .pipe(z.array(consultedSourceSchema));

const summaryRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  minuta_id: z.string().nullable(),
  use_library: z.number(),
  use_jurisprudencia: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  preview: z.string().nullable(),
  replying: z.number(),
});

const detailRowSchema = summaryRowSchema.extend({ minuta_title: z.string().nullable() });

const messageRowSchema = z.object({
  id: z.number(),
  role: z.enum(CHAT_ROLES),
  content: z.string(),
  status: z.enum(CHAT_MESSAGE_STATUSES),
  error: z.string().nullable(),
  sources: sourcesJson,
  task_id: z.string().nullable(),
  created_at: z.string(),
});

const idRowSchema = z.object({ id: z.number() });

const jsonText = z.string().transform((json) => JSON.parse(json) as unknown);

const stepRowSchema = z.object({
  id: z.number(),
  message_id: z.number(),
  tool: z.string(),
  kind: z.enum(TOOL_KINDS),
  input: jsonText,
  summary: z.string(),
  output: z.string().nullable(),
  card: jsonText.pipe(toolCardSchema).nullable(),
  status: z.enum(TOOL_STEP_STATUSES),
  created_at: z.string(),
});

function toStoredStep(row: unknown): StoredToolStep {
  const parsed = stepRowSchema.parse(row);
  return {
    id: parsed.id,
    messageId: parsed.message_id,
    tool: parsed.tool,
    kind: parsed.kind,
    input: parsed.input,
    summary: parsed.summary,
    status: parsed.status,
    output: parsed.output,
    card: parsed.card,
    createdAt: parsed.created_at,
  };
}

/** The step without its input, which never leaves the server. */
function toStep(step: StoredToolStep): ChatToolStep {
  const { id, tool, kind, summary, status, output, card, createdAt } = step;
  return { id, tool, kind, summary, status, output, card, createdAt };
}

/** A decided action and what came of it. */
export interface StepOutcome {
  status: Extract<ToolStepStatus, "confirmed" | "rejected" | "failed">;
  output: string;
  /** Replaces the card shown while it waited, e.g. with a link to what the action created. */
  card?: ToolCard | null;
}

export interface NewConversation {
  ownerId: string;
  title: string;
  minutaId: string | null;
  useLibrary: boolean;
  useJurisprudencia: boolean;
}

export interface ChatExchange {
  /** The pending assistant message that will hold the answer. */
  replyId: number;
}

export interface ChatRepository {
  createConversation(conversation: NewConversation): string;
  /** Conversations are private: reads and changes take the owner, and another user's id reads as missing. */
  list(ownerId: string): ChatConversationSummary[];
  get(id: string, ownerId: string): ChatConversation | null;
  rename(id: string, ownerId: string, title: string): boolean;
  setUseLibrary(id: string, ownerId: string, useLibrary: boolean): boolean;
  setUseJurisprudencia(id: string, ownerId: string, useJurisprudencia: boolean): boolean;
  delete(id: string, ownerId: string): boolean;
  /**
   * Adds the user's message and an empty pending reply in one step. Throws ChatBusyError while another
   * reply of the conversation is pending, so questions are answered one at a time and in order.
   */
  addExchange(conversationId: string, content: string): ChatExchange;
  /**
   * Adds only a pending reply, for the assistant to carry on after the user confirmed or rejected an
   * action. Throws ChatBusyError while another reply is pending.
   */
  addContinuation(conversationId: string): ChatExchange;
  attachTask(replyId: number, taskId: string): void;
  /**
   * Fills a pending reply with its text, sources and tool steps; false when it is no longer pending
   * (retried elsewhere, conversation deleted).
   */
  completeReply(replyId: number, content: string, sources: ConsultedSource[], steps?: NewToolStep[]): boolean;
  failReply(replyId: number, error: string): boolean;
  /** Puts a failed reply back to pending, e.g. before queueing it again. */
  retryReply(conversationId: string, replyId: number): boolean;
  /** A step of the conversation, with its input; the caller has already checked the conversation's owner. */
  getStep(conversationId: string, stepId: number): StoredToolStep | null;
  /**
   * Takes the decision on a waiting action, so it runs once even if confirmed twice at the same time;
   * false when it was already decided.
   */
  claimStep(stepId: number, status: "confirmed" | "rejected"): boolean;
  recordStepOutcome(stepId: number, outcome: StepOutcome): void;
}

function toMessage(row: unknown): ChatMessage {
  const parsed = messageRowSchema.parse(row);
  return {
    id: parsed.id,
    role: parsed.role,
    content: parsed.content,
    status: parsed.status,
    error: parsed.error,
    sources: parsed.sources,
    steps: [],
    taskId: parsed.task_id,
    createdAt: parsed.created_at,
  };
}

function toSummary(row: unknown): ChatConversationSummary {
  const parsed = summaryRowSchema.parse(row);
  return {
    id: parsed.id,
    title: parsed.title,
    minutaId: parsed.minuta_id,
    useLibrary: parsed.use_library === 1,
    useJurisprudencia: parsed.use_jurisprudencia === 1,
    createdAt: parsed.created_at,
    updatedAt: parsed.updated_at,
    preview: parsed.preview,
    isReplying: parsed.replying === 1,
  };
}

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

const SUMMARY_COLUMNS = `
  c.id, c.title, c.minuta_id, c.use_library, c.use_jurisprudencia, c.created_at, c.updated_at,
  (SELECT substr(m.content, 1, ${PREVIEW_CHARS}) FROM chat_conversation_messages m
    WHERE m.conversation_id = c.id AND m.content <> '' ORDER BY m.id DESC LIMIT 1) AS preview,
  EXISTS (SELECT 1 FROM chat_conversation_messages m
    WHERE m.conversation_id = c.id AND m.status = 'pending') AS replying`;

export function createChatRepository(db: DatabaseSync): ChatRepository {
  const insertConversation = db.prepare(
    "INSERT INTO chat_conversations (id, owner_id, title, minuta_id, use_library, use_jurisprudencia) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const selectSummaries = db.prepare(
    `SELECT ${SUMMARY_COLUMNS} FROM chat_conversations c WHERE c.owner_id = ? ORDER BY c.updated_at DESC`,
  );
  const selectDetail = db.prepare(
    `SELECT ${SUMMARY_COLUMNS}, (SELECT title FROM minutas WHERE id = c.minuta_id) AS minuta_title
     FROM chat_conversations c WHERE c.id = ? AND c.owner_id = ?`,
  );
  const selectExists = db.prepare("SELECT 1 FROM chat_conversations WHERE id = ?");
  const selectSteps = db.prepare(
    `SELECT s.id, s.message_id, s.tool, s.kind, s.input, s.summary, s.output, s.card, s.status, s.created_at
     FROM chat_tool_steps s JOIN chat_conversation_messages m ON m.id = s.message_id
     WHERE m.conversation_id = ? ORDER BY s.message_id, s.position`,
  );
  const selectStep = db.prepare(
    `SELECT s.id, s.message_id, s.tool, s.kind, s.input, s.summary, s.output, s.card, s.status, s.created_at
     FROM chat_tool_steps s JOIN chat_conversation_messages m ON m.id = s.message_id
     WHERE m.conversation_id = ? AND s.id = ?`,
  );
  const insertStep = db.prepare(
    `INSERT INTO chat_tool_steps (message_id, position, tool, kind, input, summary, output, card, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const dismissWaitingSteps = db.prepare(
    `UPDATE chat_tool_steps SET status = 'rejected', output = ?, decided_at = ${NOW}
     WHERE status = 'awaiting_confirmation'
       AND message_id IN (SELECT id FROM chat_conversation_messages WHERE conversation_id = ?)`,
  );
  const claimWaitingStep = db.prepare(
    `UPDATE chat_tool_steps SET status = ?, decided_at = ${NOW} WHERE id = ? AND status = 'awaiting_confirmation'`,
  );
  const updateStepOutcome = db.prepare("UPDATE chat_tool_steps SET status = ?, output = ?, card = ? WHERE id = ?");
  const updateStepOutcomeKeepingCard = db.prepare("UPDATE chat_tool_steps SET status = ?, output = ? WHERE id = ?");
  const selectMessages = db.prepare(
    `SELECT id, role, content, status, error, sources, task_id, created_at
     FROM chat_conversation_messages WHERE conversation_id = ? ORDER BY id`,
  );
  const updateTitle = db.prepare(
    `UPDATE chat_conversations SET title = ?, updated_at = ${NOW} WHERE id = ? AND owner_id = ?`,
  );
  const updateUseLibrary = db.prepare("UPDATE chat_conversations SET use_library = ? WHERE id = ? AND owner_id = ?");
  const updateUseJurisprudencia = db.prepare(
    "UPDATE chat_conversations SET use_jurisprudencia = ? WHERE id = ? AND owner_id = ?",
  );
  const touch = db.prepare(`UPDATE chat_conversations SET updated_at = ${NOW} WHERE id = ?`);
  const deleteConversation = db.prepare("DELETE FROM chat_conversations WHERE id = ? AND owner_id = ?");
  const selectPending = db.prepare(
    "SELECT 1 FROM chat_conversation_messages WHERE conversation_id = ? AND status = 'pending'",
  );
  const insertMessage = db.prepare(
    `INSERT INTO chat_conversation_messages (conversation_id, role, content, status) VALUES (?, ?, ?, ?) RETURNING id`,
  );
  const updateTask = db.prepare("UPDATE chat_conversation_messages SET task_id = ? WHERE id = ?");
  const complete = db.prepare(
    `UPDATE chat_conversation_messages SET content = ?, sources = ?, status = 'done', error = NULL
     WHERE id = ? AND status = 'pending' RETURNING conversation_id`,
  );
  const fail = db.prepare(
    "UPDATE chat_conversation_messages SET status = 'failed', error = ? WHERE id = ? AND status = 'pending'",
  );
  const retry = db.prepare(
    `UPDATE chat_conversation_messages SET status = 'pending', error = NULL, task_id = NULL
     WHERE id = ? AND conversation_id = ? AND role = 'assistant' AND status = 'failed'`,
  );

  function conversationExists(id: string): boolean {
    return selectExists.get(id) !== undefined;
  }

  return {
    createConversation({ ownerId, title, minutaId, useLibrary, useJurisprudencia }) {
      const id = randomUUID();
      insertConversation.run(id, ownerId, title, minutaId, useLibrary ? 1 : 0, useJurisprudencia ? 1 : 0);
      return id;
    },

    list: (ownerId) => selectSummaries.all(ownerId).map(toSummary),

    get(id, ownerId) {
      const row = selectDetail.get(id, ownerId);
      if (!row) return null;
      return {
        ...toSummary(row),
        minutaTitle: detailRowSchema.parse(row).minuta_title,
        messages: withSteps(selectMessages.all(id).map(toMessage), selectSteps.all(id).map(toStoredStep)),
      };
    },

    rename: (id, ownerId, title) => updateTitle.run(title, id, ownerId).changes > 0,
    setUseLibrary: (id, ownerId, useLibrary) => updateUseLibrary.run(useLibrary ? 1 : 0, id, ownerId).changes > 0,
    setUseJurisprudencia: (id, ownerId, useJurisprudencia) =>
      updateUseJurisprudencia.run(useJurisprudencia ? 1 : 0, id, ownerId).changes > 0,
    delete: (id, ownerId) => deleteConversation.run(id, ownerId).changes > 0,

    addExchange(conversationId, content) {
      return withTransaction(db, () => {
        if (!conversationExists(conversationId)) throw new Error(`Conversation ${conversationId} not found.`);
        if (selectPending.get(conversationId)) throw new ChatBusyError();
        // A new question moves on from any action still waiting; the model is told it wasn't run.
        dismissWaitingSteps.run(STEP_DISMISSED_OUTPUT, conversationId);
        insertMessage.run(conversationId, "user", content, "done");
        const reply = idRowSchema.parse(insertMessage.get(conversationId, "assistant", "", "pending"));
        touch.run(conversationId);
        return { replyId: reply.id };
      });
    },

    addContinuation(conversationId) {
      return withTransaction(db, () => {
        if (!conversationExists(conversationId)) throw new Error(`Conversation ${conversationId} not found.`);
        if (selectPending.get(conversationId)) throw new ChatBusyError();
        const reply = idRowSchema.parse(insertMessage.get(conversationId, "assistant", "", "pending"));
        touch.run(conversationId);
        return { replyId: reply.id };
      });
    },

    attachTask: (replyId, taskId) => void updateTask.run(taskId, replyId),

    completeReply(replyId, content, sources, steps = []) {
      return withTransaction(db, () => {
        const row = complete.get(content, JSON.stringify(sources), replyId) as { conversation_id: string } | undefined;
        if (!row) return false;
        steps.forEach((step, index) =>
          insertStep.run(
            replyId,
            index + 1,
            step.tool,
            step.kind,
            JSON.stringify(step.input ?? null),
            step.summary,
            step.output,
            step.card ? JSON.stringify(step.card) : null,
            step.status,
          ),
        );
        touch.run(row.conversation_id);
        return true;
      });
    },

    failReply: (replyId, error) => fail.run(error, replyId).changes > 0,

    retryReply(conversationId, replyId) {
      return withTransaction(db, () => {
        if (selectPending.get(conversationId)) throw new ChatBusyError();
        return retry.run(replyId, conversationId).changes > 0;
      });
    },

    getStep(conversationId, stepId) {
      const row = selectStep.get(conversationId, stepId);
      return row ? toStoredStep(row) : null;
    },

    claimStep: (stepId, status) => claimWaitingStep.run(status, stepId).changes > 0,

    recordStepOutcome(stepId, { status, output, card }) {
      if (card === undefined) updateStepOutcomeKeepingCard.run(status, output, stepId);
      else updateStepOutcome.run(status, output, card ? JSON.stringify(card) : null, stepId);
    },
  };
}

function withSteps(messages: ChatMessage[], steps: StoredToolStep[]): ChatMessage[] {
  const byMessage = Map.groupBy(steps, (step) => step.messageId);
  return messages.map((message) => ({ ...message, steps: (byMessage.get(message.id) ?? []).map(toStep) }));
}
