import "server-only";
import { z } from "zod";
import { getChatRepository } from "@/lib/chat/getChatRepository";
import { buildTranscript } from "@/lib/chat/history";
import { CONVERSATION_NOT_FOUND_MESSAGE, EMPTY_CONVERSATION_MESSAGE } from "@/lib/chat/messages";
import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { getStructuredGenerator } from "@/lib/llm/getStructuredGenerator";
import { parseStructured } from "@/lib/llm/parseStructured";
import { TaskInputError } from "@/lib/tasks/errors";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { toPersonaSummary } from "@/lib/personas/toPersonaSummary";
import { taskOwner, type TaskHandler } from "@/lib/tasks/handler";
import { buildDraftSuggestionPrompt, type DraftSuggestionSource } from "./buildDraftSuggestionPrompt";
import {
  DRAFT_EXTRACTION_JSON_SCHEMA,
  draftExtractionSchema,
  draftSuggestionResultSchema,
  toReviewNotes,
  toSuggestedDraft,
  type DraftSuggestionResult,
} from "./draftSuggestion";
import { draftSuggestionPath } from "./paths";
import { baseDocumentSchema, type BaseDocument } from "./schema";

const DRAFT_SCHEMA_NAME = "preenchimento_de_minuta";
const READING_LABELS: Record<DraftSuggestionPayload["source"], string> = {
  document: "Lendo o documento",
  conversation: "Lendo a conversa",
};

interface ReadSource {
  source: DraftSuggestionSource;
  sourceName: string;
  baseDocument: BaseDocument | null;
}

/** What the model reads: the uploaded document, or the conversation with the Advogado IA. */
function readSource(payload: DraftSuggestionPayload, ownerId: string | null): ReadSource {
  if (payload.source === "document") {
    const { document } = payload;
    return {
      source: { kind: "document", name: document.name, text: document.text },
      sourceName: document.name,
      baseDocument: document,
    };
  }
  const conversation = getChatRepository().get(payload.conversationId, taskOwner({ ownerId }));
  if (!conversation) throw new TaskInputError(CONVERSATION_NOT_FOUND_MESSAGE);
  const transcript = buildTranscript(conversation.messages);
  if (!transcript) throw new TaskInputError(EMPTY_CONVERSATION_MESSAGE);
  return {
    source: { kind: "conversation", title: conversation.title, transcript },
    sourceName: conversation.title,
    baseDocument: null,
  };
}

export const draftSuggestionPayloadSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("document"), document: baseDocumentSchema }),
  z.object({ source: z.literal("conversation"), conversationId: z.string() }),
]);
export type DraftSuggestionPayload = z.infer<typeof draftSuggestionPayloadSchema>;

/** Reads a base document or a conversation and suggests how to fill the minuta form; the user reviews it. */
export const suggestDraftTask: TaskHandler<DraftSuggestionPayload, DraftSuggestionResult> = {
  kind: "minuta.extract",
  lane: "llm",
  payloadSchema: draftSuggestionPayloadSchema,
  resultSchema: draftSuggestionResultSchema,

  async run({ payload, ownerId, signal, reportProgress }) {
    reportProgress(0, null, READING_LABELS[payload.source]);
    const { source, sourceName, baseDocument } = readSource(payload, ownerId);
    const clauses = getClauseRepository().list();
    const personas = getPersonaRepository().list().map(toPersonaSummary);
    const prompt = buildDraftSuggestionPrompt(source, { clauses, personas });
    const { text, usage } = await getStructuredGenerator("minuta_extract")(
      prompt,
      { name: DRAFT_SCHEMA_NAME, schema: DRAFT_EXTRACTION_JSON_SCHEMA },
      { signal },
    );
    const extraction = parseStructured(draftExtractionSchema, text, usage);
    return {
      source: payload.source,
      sourceName,
      draft: toSuggestedDraft(extraction, {
        clauseIds: new Set(clauses.map((clause) => clause.id)),
        personaIds: new Set(personas.map((persona) => persona.id)),
      }),
      reviewNotes: toReviewNotes(extraction.reviewNotes),
      baseDocument,
    };
  },

  describeSuccess: (result, task) => ({
    level: "success",
    title: "Sugestões prontas para a minuta",
    body: `A partir de “${result.sourceName}”. Revise os campos antes de gerar.`,
    href: draftSuggestionPath(task.id),
  }),
  describeFailure: (message, _task, payload) => ({
    level: "error",
    title:
      payload?.source === "conversation"
        ? "Não foi possível preparar a minuta a partir da conversa"
        : "Não foi possível ler o documento base",
    body: message,
    href: null,
  }),
};
