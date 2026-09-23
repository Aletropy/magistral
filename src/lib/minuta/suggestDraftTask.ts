import "server-only";
import { z } from "zod";
import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { getStructuredGenerator } from "@/lib/llm/getStructuredGenerator";
import { parseStructured } from "@/lib/llm/parseStructured";
import type { TaskHandler } from "@/lib/tasks/handler";
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
import { baseDocumentSchema } from "./schema";

const DRAFT_SCHEMA_NAME = "preenchimento_de_minuta";
const READING_LABEL = "Lendo o documento";

export const draftSuggestionPayloadSchema = z.object({
  source: z.literal("document"),
  document: baseDocumentSchema,
});
export type DraftSuggestionPayload = z.infer<typeof draftSuggestionPayloadSchema>;

/** Reads a base document and suggests how to fill the minuta form; the user reviews before applying. */
export const suggestDraftTask: TaskHandler<DraftSuggestionPayload, DraftSuggestionResult> = {
  kind: "minuta.extract",
  lane: "llm",
  payloadSchema: draftSuggestionPayloadSchema,
  resultSchema: draftSuggestionResultSchema,

  async run({ payload, signal, reportProgress }) {
    reportProgress(0, null, READING_LABEL);
    const { document } = payload;
    const source: DraftSuggestionSource = { kind: "document", name: document.name, text: document.text };
    const clauses = getClauseRepository().list();
    const prompt = buildDraftSuggestionPrompt(source, clauses);
    const { text, usage } = await getStructuredGenerator("minuta_extract")(
      prompt,
      { name: DRAFT_SCHEMA_NAME, schema: DRAFT_EXTRACTION_JSON_SCHEMA },
      { signal },
    );
    const extraction = parseStructured(draftExtractionSchema, text, usage);
    return {
      source: "document",
      sourceName: document.name,
      draft: toSuggestedDraft(extraction, new Set(clauses.map((clause) => clause.id))),
      reviewNotes: toReviewNotes(extraction.reviewNotes),
      baseDocument: document,
    };
  },

  describeSuccess: (result, task) => ({
    level: "success",
    title: "Sugestões prontas para a minuta",
    body: `Lemos ${result.sourceName}. Revise os campos antes de gerar.`,
    href: draftSuggestionPath(task.id),
  }),
  describeFailure: (message) => ({
    level: "error",
    title: "Não foi possível ler o documento base",
    body: message,
    href: null,
  }),
};
