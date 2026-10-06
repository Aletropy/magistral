import "server-only";
import { z } from "zod";
import { createCitationRegistry } from "@/lib/assistant/citations";
import { describePageContext } from "@/lib/assistant/describePageContext";
import { pageContextSchema } from "@/lib/assistant/pageContext";
import { isJurisprudenciasConnected } from "@/lib/integrations/jurisprudencias/connection";
import { getBatchRepository } from "@/lib/batch/getBatchRepository";
import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { getAssistantTools } from "@/lib/assistant/getAssistantTools";
import { runAgent } from "@/lib/assistant/runAgent";
import { getToolChatGenerator } from "@/lib/llm/getToolChatGenerator";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";
import { TaskInputError } from "@/lib/tasks/errors";
import { taskOwner, type TaskHandler } from "@/lib/tasks/handler";
import { CHAT_TEMPERATURE, buildChatSystemPrompt, toAgentHistory, type ChatPromptContext } from "./buildChatPrompt";
import { getChatRepository } from "./getChatRepository";
import { normalizeChatHistory, normalizeCitations } from "./history";
import { loadAppData } from "./loadAppData";
import { CONVERSATION_NOT_FOUND_MESSAGE, REPLY_CANCELED_MESSAGE } from "./messages";
import { ASSISTANT_PATH, conversationPath } from "./paths";

/** A saved minuta under discussion is cut here, so a very long one can't crowd out the conversation. */
export const CHAT_MINUTA_MAX_CHARS = 60_000;

const THINKING_LABEL = "Pensando na resposta";
const REPLY_NOT_PENDING_MESSAGE = "Esta resposta não está mais aguardando.";

const chatReplyPayloadSchema = z.object({
  conversationId: z.string(),
  replyId: z.number(),
  /** Absent in replies queued before the panel existed. */
  context: pageContextSchema.nullable().default(null),
});
type ChatReplyPayload = z.infer<typeof chatReplyPayloadSchema>;

const chatReplyResultSchema = z.object({
  conversationId: z.string(),
  title: z.string(),
  /** The reply ends with an action for the user to confirm. */
  awaitingConfirmation: z.boolean().default(false),
});
type ChatReplyResult = z.infer<typeof chatReplyResultSchema>;

/**
 * Answers the latest question of a conversation, or carries on after the user decided on an action. The
 * model reads the user's data and the library with tools, and may end the reply proposing one action.
 */
export const chatReplyTask: TaskHandler<ChatReplyPayload, ChatReplyResult> = {
  kind: "chat.reply",
  lane: "llm",
  payloadSchema: chatReplyPayloadSchema,
  resultSchema: chatReplyResultSchema,

  async run(context) {
    const { payload, signal, reportProgress, commit } = context;
    const ownerId = taskOwner(context);
    const chats = getChatRepository();
    const conversation = chats.get(payload.conversationId, ownerId);
    if (!conversation) throw new TaskInputError(CONVERSATION_NOT_FOUND_MESSAGE);
    const reply = conversation.messages.find((message) => message.id === payload.replyId);
    if (reply?.status !== "pending") throw new TaskInputError(REPLY_NOT_PENDING_MESSAGE);

    const history = normalizeChatHistory(conversation.messages.filter((message) => message.id < reply.id));
    if (history.length === 0) throw new TaskInputError(CONVERSATION_NOT_FOUND_MESSAGE);

    const hasLibrary = getLibraryRepository().totalChars() > 0;
    const library: ChatPromptContext["library"] = !conversation.useLibrary ? "off" : hasLibrary ? "on" : "empty";
    const saved = conversation.minutaId ? getMinutaRepository().get(conversation.minutaId, ownerId) : null;
    const minuta = saved ? { title: saved.title, markdown: saved.result.markdown.slice(0, CHAT_MINUTA_MAX_CHARS) } : null;
    const citations = createCitationRegistry();
    const jurisprudencia: ChatPromptContext["jurisprudencia"] = !isJurisprudenciasConnected()
      ? "unavailable"
      : conversation.useJurisprudencia
        ? "on"
        : "off";
    const pageContext = payload.context
      ? describePageContext(payload.context, ownerId, {
          minutas: getMinutaRepository(),
          personas: getPersonaRepository(),
          clauses: getClauseRepository(),
          batches: getBatchRepository(),
        })
      : null;

    reportProgress(0, null, THINKING_LABEL);
    const result = await runAgent({
      generator: getToolChatGenerator("chat"),
      system: buildChatSystemPrompt({ appData: loadAppData(), library, jurisprudencia, minuta, pageContext }),
      history: toAgentHistory(history),
      tools: getAssistantTools({ searchLibrary: library === "on", jurisprudencia: jurisprudencia === "on" }),
      temperature: CHAT_TEMPERATURE,
      context: { ownerId, conversationId: conversation.id, signal, citations },
      onProgress: (label) => reportProgress(0, null, label),
    });

    const answer = normalizeCitations(result.text);
    return commit(() => {
      chats.completeReply(reply.id, answer, citations.consulted(), result.steps);
      return { conversationId: conversation.id, title: conversation.title, awaitingConfirmation: result.awaitingConfirmation };
    });
  },

  onFailed: (payload, message) => void getChatRepository().failReply(payload.replyId, message),
  onCanceled: (payload) => void getChatRepository().failReply(payload.replyId, REPLY_CANCELED_MESSAGE),

  describeSuccess: (result) => ({
    level: "success",
    title: result.awaitingConfirmation ? "O Advogado IA espera sua confirmação" : "O Advogado IA respondeu",
    body: result.title,
    href: conversationPath(result.conversationId),
  }),
  describeFailure: (message, task, payload) => ({
    level: "error",
    title: "O Advogado IA não conseguiu responder",
    body: message,
    href: payload ? conversationPath(payload.conversationId) : ASSISTANT_PATH,
  }),
};
