import "server-only";
import { z } from "zod";
import { getChatGenerator } from "@/lib/llm/getChatGenerator";
import { getEmbedder } from "@/lib/llm/getEmbedder";
import { MinutaGenerationError } from "@/lib/llm/errors";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";
import { selectLibraryContext, type ContextSource } from "@/lib/rag/selectContext";
import { TaskInputError } from "@/lib/tasks/errors";
import { taskOwner, type TaskHandler } from "@/lib/tasks/handler";
import { buildChatPrompt, buildChatRetrievalQuery } from "./buildChatPrompt";
import { getChatRepository } from "./getChatRepository";
import { normalizeChatHistory, normalizeCitations } from "./history";
import { loadAppData } from "./loadAppData";
import { CONVERSATION_NOT_FOUND_MESSAGE, REPLY_CANCELED_MESSAGE } from "./messages";
import { ASSISTANT_PATH, conversationPath } from "./paths";

/**
 * Libraries up to this size go whole into every answer's instructions (about 15k tokens); larger ones are
 * searched per question. Smaller than the minuta's budget because a chat pays it on every turn.
 */
export const CHAT_FULL_CONTEXT_MAX_CHARS = 60_000;
/** A saved minuta under discussion is cut here, so a very long one can't crowd out the conversation. */
export const CHAT_MINUTA_MAX_CHARS = 60_000;

const LIBRARY_LABEL = "Consultando a biblioteca";
const WRITING_LABEL = "Escrevendo a resposta";
const REPLY_STEPS = 2;
const REPLY_NOT_PENDING_MESSAGE = "Esta resposta não está mais aguardando.";

const chatReplyPayloadSchema = z.object({ conversationId: z.string(), replyId: z.number() });
type ChatReplyPayload = z.infer<typeof chatReplyPayloadSchema>;

const chatReplyResultSchema = z.object({ conversationId: z.string(), title: z.string() });
type ChatReplyResult = z.infer<typeof chatReplyResultSchema>;

/** Answers the latest question of a conversation, grounded in the library when the conversation asks for it. */
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

    let sources: ContextSource[] = [];
    const library = getLibraryRepository();
    if (conversation.useLibrary && library.totalChars() > 0) {
      reportProgress(0, REPLY_STEPS, LIBRARY_LABEL);
      const context = await selectLibraryContext(
        library,
        getEmbedder(),
        buildChatRetrievalQuery(history),
        CHAT_FULL_CONTEXT_MAX_CHARS,
      );
      sources = context.sources;
    }

    signal.throwIfAborted();
    reportProgress(1, REPLY_STEPS, WRITING_LABEL);
    const saved = conversation.minutaId ? getMinutaRepository().get(conversation.minutaId, ownerId) : null;
    const minuta = saved ? { title: saved.title, markdown: saved.result.markdown.slice(0, CHAT_MINUTA_MAX_CHARS) } : null;
    const prompt = buildChatPrompt(
      { appData: loadAppData(), sources, libraryRequested: conversation.useLibrary, minuta },
      history,
    );
    const { text } = await getChatGenerator("chat")(prompt, { signal });
    const answer = normalizeCitations(text.trim());
    if (!answer) throw new MinutaGenerationError("empty");

    const consulted = sources.map(({ ref, title, label }) => ({ ref, title, label }));
    return commit(() => {
      chats.completeReply(reply.id, answer, consulted);
      return { conversationId: conversation.id, title: conversation.title };
    });
  },

  onFailed: (payload, message) => void getChatRepository().failReply(payload.replyId, message),
  onCanceled: (payload) => void getChatRepository().failReply(payload.replyId, REPLY_CANCELED_MESSAGE),

  describeSuccess: (result) => ({
    level: "success",
    title: "O Advogado IA respondeu",
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
